---
path: '/part-2/3-configuring-applications'
title: 'Configuring applications'
hidden: false
---

<text-box variant='learningObjectives' name='Learning Objectives'>

After this section you

- know about CRDs

- know how to pass variables in to your pods

</text-box>

There are two resources for configuration management. *Secrets* are for sensitive information that are given to containers on runtime. *ConfigMaps* are basically secrets but may contain any kinds of configuration. Use cases for ConfigMaps vary: you may have a ConfigMap mapped to a file with some values that the server reads during runtime and changing the ConfigMap will instantly change the behavior of the application. Both can be used to introduce environment variables.

### Secrets ###

Let's use [pixabay](https://pixabay.com/) to display images on a simple web app. We will need to utilize authentication with an API key.
The API docs are good, we just need to log in to get ourselves a key here https://pixabay.com/api/docs/.

Here's the app available. The application requires an API_KEY environment variable.

```console
$ kubectl apply -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app4/manifests/deployment.yaml \
                -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app4/manifests/ingress.yaml \
                -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app4/manifests/service.yaml
```

The requirement for an environment variable inside a secret is added to the deployment like so

**deployment.yaml**

```yaml
...
      containers:
        - name: imageagain
          envFrom:
          - secretRef:
              name: pixabay-apikey
```

or if we wanted to remap the field, for example to use the same secret in multiple applications:

**deployment.yaml**

```yaml
...
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

As the containers are already instructed to use the environment from the secret using it happens automatically. We can now confirm that the app is working and then delete the old secret.

For encrypted secrets let's use ["Sealed Secrets"](https://github.com/bitnami-labs/sealed-secrets). It seems to be a solution until proven otherwise. We need to install it into our local machine as well as to our cluster. Install [instructions](https://github.com/bitnami-labs/sealed-secrets/releases) are simple: apply the correct version to kube-system namespace.

```console
$ kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.12.1/controller.yaml
```

It may take a while to start but after that it's ready to convert your secret into a sealed secret and apply it. Before that confirm that we didn't forget to remove the old secret.

```console
$ kubectl get secrets
  NAME                  TYPE                                  DATA   AGE
  default-token-jfr7n   kubernetes.io/service-account-token   3      36m

$ kubeseal -o yaml < secret.yaml > sealedsecret.yaml
$ kubectl apply -f sealedsecret.yaml
$ kubectl get secrets
  NAME                  TYPE                                  DATA   AGE
  default-token-jfr7n   kubernetes.io/service-account-token   3      37m
  pixabay-apikey        Opaque                                1      2s
```

To confirm everything is working we can delete the pod and let it restart with the new environment variable `kubectl delete po imageapi-dep-...`. Using *SealedSecret* was our first time using a custom resource. We will be designing our own custom resources in [part 5](https://devopswithkubernetes.com/part5/).

<exercise name='Exercise 2.05: Secrets'>

  In all future exercises if you are using an API key or a password, such as a database password, you will use Secrets. You can use `SealedSecrets` to store it to a git repository.

  There's nothing specific to submit, all following submissions should follow the rule above.

</exercise>

### ConfigMaps ###

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
