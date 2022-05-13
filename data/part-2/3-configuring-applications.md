---
path: "/part-2/3-configuring-applications"
title: "Configuring applications"
hidden: false
---

<text-box variant='learningObjectives' name='Learning Objectives'>

After this section you

- know how to pass variables in to your pods

- have options for storing secrets into version control

- have experience searching information in the kubernetes documentation

</text-box>

There are two resources for configuration management. **Secrets** are for sensitive information that are given to containers on runtime. **ConfigMaps** are basically secrets but may contain any kinds of configuration. Use cases for ConfigMaps vary: you may have a ConfigMap mapped to a file with some values that the server reads during runtime and changing the ConfigMap will instantly change the behavior of the application. Both can be used to introduce environment variables.

### Secrets

Let's use [pixabay](https://pixabay.com/) to display images on a simple web app. We will need to utilize authentication with an API key.
The API docs are good, we just need to log in to get ourselves a key here https://pixabay.com/api/docs/.

Here's the [app](https://github.com/kubernetes-hy/material-example/tree/master/app4/manifests). The application requires an API_KEY environment variable.

```console
$ kubectl apply -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app4/manifests/deployment.yaml \
                -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app4/manifests/ingress.yaml \
                -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app4/manifests/service.yaml
```

The requirement for an environment variable inside a secret is added to the deployment like so

**deployment.yaml**

```yaml
# ...
containers:
  - name: imageagain
    envFrom:
      - secretRef:
          name: pixabay-apikey
```

or if we wanted to remap the field, for example to use the same secret in multiple applications:

**deployment.yaml**

```yaml
# ...
containers:
  - name: imageagain
    env:
      - name: API_KEY # ENV name passed to container
        valueFrom:
          secretKeyRef:
            name: pixabay-apikey
            key: API_KEY # ENV name in the secret
```

The application won't run at first and we can see the reason with `kubectl get po` and a more detailed with `kubectl describe pod imageapi-dep-...`.

Let's use a secret to pass the API key environment variable to the application.

Secrets use base64 encoding to avoid having to deal with special characters. We would like to use encryption to avoid printing our API_KEY for the world to see but for the sake of testing create and apply a new file secret.yaml with the following:

**secret.yaml**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: pixabay-apikey
data:
  API_KEY: aHR0cDovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PWRRdzR3OVdnWGNR # base64 encoded should look something like this, note that this won't work
```

As the containers are already instructed to use the environment from the secret using it happens automatically. We can now confirm that the app is working at http://localhost:8081.

Since anyone can reverse the base64 version we can't save that to version control. Since we want to store the configuration we make into a long-term storage we'll need to encrypt the value.

Let's use [SOPS](https://github.com/mozilla/sops) to encrypt the secret yaml. There are multiple methods for encryption. Of those we will choose [age](https://github.com/FiloSottile/age) because it's recommended over PGP by the README. So install both of the tools, SOPS and age.

Let's create a key first:

```bash
$ age-keygen -o key.txt
  Public key: age17mgq9ygh23q0cr00mjn0dfn8msak0apdy0ymjv5k50qzy75zmfkqzjdam4
```

This key.txt file now contains our public and secret keys. The secret key still can not be added to version control, but its our personal key. Other developers can create their own key pairs. Let's encrypt the values under data in secret.yaml. You can also omit the --encrypted-regex if you want.

```bash
$ sops --encrypt \
       --age age17mgq9ygh23q0cr00mjn0dfn8msak0apdy0ymjv5k50qzy75zmfkqzjdam4 \
       --encrypted-regex '^(data)$' \
       secret.yaml > secret.enc.yaml
```

The secret.enc.yaml will look like this:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: pixabay-apikey
data:
  API_KEY: ENC[AES256_GCM,data:geKXBLn4kZ9A2KHnFk4RCeRRnUZn0DjtyxPSAVCtHzoh8r6YsCUX3KiYmeuaYixHv3DRKHXTyjg=,iv:Lk290gWZnUGr8ygLGoKLaEJ3pzGBySyFJFG/AjwfkJI=,tag:BOSX7xJ/E07mXz9ZFLCT2Q==,type:str]
sops:
  kms: []
  gcp_kms: []
  azure_kv: []
  hc_vault: []
  age:
    - recipient: age17mgq9ygh23q0cr00mjn0dfn8msak0apdy0ymjv5k50qzy75zmfkqzjdam4
      enc: |
        -----BEGIN AGE ENCRYPTED FILE-----
        YWdlLWVuY3J5cHRpb24ub3JnL3YxCi0+IFgyNTUxOSBDczBhbGNxUkc4R0U0SWZI
        OEVYTEdzNUlVMEY3WnR6aVJ6OEpGeCtJQ1hVCjVSbDBRUnhLQjZYblQ0UHlneDIv
        UmswM2xKUWxRMHZZQjVJU21UbDNEb3MKLS0tIGhOMy9lQWx4Q0FUdVhoVlZQMjZz
        dDEreFAvV3Nqc3lIRWh3RGRUczBzdXcKh7S4q8qp5SrDXLQHZTpYlG43vLfBlqcZ
        BypI8yEuu18rCjl3HJ+9jbB0mrzp60ld6yojUnaggzEaVaCPSH/BMA==
        -----END AGE ENCRYPTED FILE-----
  lastmodified: "2021-10-29T12:20:40Z"
  mac: ENC[AES256_GCM,data:qhOMGFCDBXWhuildW81qTni1bnaBBsYo7UHlv2PfQf8yVrdXDtg7GylX9KslGvK22/9xxa2dtlDG7cIrYFpYQPAh/WpOzzn9R26nuTwvZ6RscgFzHCR7yIqJexZJJszC5yd3w5RArKR4XpciTeG53ygb+ng6qKdsQsvb9nQeBxk=,iv:PZLF3Y+OhtLo+/M0C0hqINM/p5K94tb5ZGc/OG8loJI=,tag:ziFOjWuAW/7kSA5tyAbgNg==,type:str]
  pgp: []
  encrypted_regex: ^(data)$
  version: 3.7.1
```

and we can store it to the version control! Anyone with the secret key pair of `age17mgq9ygh23q0cr00mjn0dfn8msak0apdy0ymjv5k50qzy75zmfkqzjdam4` will be able to decode it. Remember to use your own keys!

Now you can store the secret.enc.yaml to your version control.

If we want to encrypt for the whole team we will need to add a list of public keys while encrypting. Any of the private key owners can decrypt the file. In fact, the best method is that (almost) no-one has the private key! Public key can be used to encrypt individual files and the private key can be stored separately and used to decrypt the file just in time.

You can decrypt the encrypted file by exporting the key file in SOPS_AGE_KEY_FILE environment variable and running sops with --decrypt flag.

```console
$ export SOPS_AGE_KEY_FILE=$(pwd)/key.txt

$ sops --decrypt secret.enc.yaml > secret.yaml

# Or you can apply a secret yaml via piping directly, helps avoid creaing plain secret.yaml file:
$ sops --decrypt secret.enc.yaml | kubectl apply -f -
```

<exercise name='Exercise 2.05: Secrets'>

In all future exercises if you are using an API key or a password, such as a database password, you will use Secrets. You can use `SOPS` to store it to a git repository. _Never_ save unencrypted files into a git repository.

There's nothing specific to submit, all following submissions should follow the rule above.

</exercise>

### ConfigMaps

ConfigMaps are similar but the data doesn't have to be encoded and is not encrypted. Let's say you have a videogame server that takes a "serverconfig.txt" which looks like this:

```ini
maxplayers=12
difficulty=2
```

The following ConfigMap would contain the values:

**configmap.yaml**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: example-configmap
data:
  serverconfig.txt: |
    maxplayers=12
    difficulty=2
```

Now the ConfigMap can be added into the container as a volume. By changing a value, like "maxplayers" in this case, and applying the ConfigMap the changes would be reflected in that volume.

<exercise name='Exercise 2.06: Documentation and ConfigMaps'>

Use the official Kubernetes documentation for this exercise. [https://kubernetes.io/docs/concepts/configuration/configmap/](https://kubernetes.io/docs/concepts/configuration/configmap/) and [https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/](https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/) should contain everything you need.

Create a ConfigMap for a "dotenv file". A file where you define environment variables that are loaded by the application.
For this use an environment variable "MESSAGE" with value "Hello" to test and print the value. The values from ConfigMap can be either saved to a file and read by the application, or set as environment variables and used by the application through that. Implementation is up to you but the output should look like this:

```plaintext
Hello
2020-03-30T12:15:17.705Z: 8523ecb1-c716-4cb6-a044-b9e83bb98e43.
Ping / Pongs: 3
```

</exercise>

<quiz id="66af1b78-c0b6-40b3-96eb-9264ada63190"></quiz>
