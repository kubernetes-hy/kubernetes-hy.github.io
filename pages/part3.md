---
layout: page
title: Part 3
inheader: yes
permalink: /part3/
order: 3
---

## Google Kubernetes Engine ##

We have used Kubernetes distribution k3s using docker containers via k3d. In a production environment the task of maintaining a Kubernetes cluster is often left to third parties. A managed Kubernetes as a service is often the best choice as the additional work required in maintenance exceeds the benefits of a personal cluster. In some, somewhat rare, cases setting up and maintaining your own cluster is a reasonable option. A case for it would be that your company/organization already has the hardware and/or wants to stay independent from providers, one such example could be a University. 

Even in Kubernetes then the cost for running a software that is rarely used may be higher than the value it generates. In such cases using [Serverless](https://en.wikipedia.org/wiki/Serverless_computing) solutions could be more cost efficient. Kubernetes can get really expensive really fast.

Let's focus on the Google Kubernetes Engine (GKE) costs for now. Note that the GKE costs a little bit more than its competitors.

The calculator here [https://cloud.google.com/products/calculator](https://cloud.google.com/products/calculator) offers us a picture of the pricing. I decided to try a cheap option: 6 nodes in 1 zonal cluster using 1 vCPU each. Datacenter location is in Finland and I don't need persistent disk. If we wanted less than 6 nodes why would we even use Kubernetes. The total cost for this example was 145€ - $160 per month. Adding additional services such as a Load balancer increase the cost.

During the part 3 we will be using GKE either by using the student credits or the free credits offered by google. You are responsible for making sure that the credits last for the whole part and if all of them are consumed I can not help you.

After redeeming the credits we can create a project with the billing account. The google cloud UI can be confusing. On the [resources page](https://console.cloud.google.com/cloud-resource-manager) we can create a new project and let's name it "dwk-gke" for the purposes of this course. After creating this project make sure that the project is linked to the correct billing account from the top left dropdown and billing and then "Account Management". It should look like this (account is "DevOps with Kubernetes" and project "dwk-gke"):

![]({{ "/images/part3/gke_billing.png" | absolute_url }})

Install the Google Cloud SDK. Instructions [here](https://cloud.google.com/sdk/install). After that login and set the previously created project to be used.

```console
$ gcloud -v
  Google Cloud SDK 290.0.1
  bq 2.0.56
  core 2020.04.24
  gsutil 4.49

$ gcloud auth login
  ...
  You are now logged in

$ gcloud config set project dwk-gke
  Updated property [core/project].
```

We can now create a cluster. We can choose any zone we want from the list [here](https://cloud.google.com/about/locations/). I chose Finland:

```console
$ gcloud container clusters create dwk-cluster --zone=europe-north1-b
  ...
  Creating cluster dwk-cluster in europe-north1-b...
  ...
  NAME         LOCATION         MASTER_VERSION  MASTER_IP       MACHINE_TYPE   NODE_VERSION    NUM_NODES  STATUS
  dwk-cluster  europe-north1-b  1.14.10-gke.27  35.228.239.103  n1-standard-1  1.14.10-gke.27  3          RUNNING
```

As we did with k3d we need to set kubeconfig so kubectl can access it:

```console
$ gcloud container clusters get-credentials dwk-cluster --zone=europe-north1-b
  Fetching cluster endpoint and auth data.
  kubeconfig entry generated for dwk-cluster.

$ kubectl cluster info
```

Now that we have a cluster it's used almost exactly like the one we had locally. Let's apply this application that creates a random string and then serves an image based on that random string. This will create 6 replicas of the process "seedimage".

```console
$ kubectl apply -f 
```

Now as a warning the next step is going to add into the [cost of the cluster](https://cloud.google.com/compute/all-pricing#lb) as well. Let's add a *LoadBalancer* Service!

```yml
apiVersion: v1
kind: Service
metadata:
  name: seedimage-svc
spec:
  type: LoadBalancer # This should be the only unfamiliar part
  selector:
    app: seedimage
  ports:
    - port: 80
      protocol: TCP
      targetPort: 3000
```

A load balancer service asks for google services to provision us a load balancer. We can wait until the service gets an external ip:

```console
$ kubectl get svc --watch
  NAME            TYPE           CLUSTER-IP      EXTERNAL-IP    PORT(S)        AGE
  kubernetes      ClusterIP      10.31.240.1     <none>         443/TCP        144m
  seedimage-svc   LoadBalancer   10.31.241.224   35.228.41.16   80:30215/TCP   94s
```

If we now access http://35.228.41.16 with our browser we'll see the application up and running. By refreshing the page we can also see that the load balancer sometimes offers us a different image.

<div style="border: lightblue 0.2em outset; padding: 0.5em 1em 0 1em;" markdown="1">
To avoid using up the credits delete the cluster whenever you do not need it

```console
$ gcloud container clusters delete dwk-cluster --zone=europe-north1-b
```

And when resuming progress create the cluster back.
```console
$ gcloud container clusters create dwk-cluster --zone=europe-north1-b
```

You may lose some important running applications so if you decide to take a break during an example you may have to redo it, but everything else should be saved as a yaml file.
</div>

<br />

<div class="exercise" markdown="1"> 
Exercise 11:

Deploy the main application as well as the ping / pong application into GKE.
</div>

## Deployment Pipeline ##

Let's setup a deployment pipeline using github actions.

Create a file .github/workflows/main.yaml into the exercise project root. We'll want the workflow to do 3 things:

* build the image
* publish the image to a container registry
* deploy the new image to our cluster

Google offers us an action as well as an example workflow here <https://github.com/GoogleCloudPlatform/github-actions>. Instead of reinventing the wheel let's just take the [example workflow](https://github.com/GoogleCloudPlatform/github-actions/blob/dbbc2aaee4ded56fea9d438baacbdd875addfc3f/example-workflows/gke/.github/workflows/gke.yml) and see what's going on.

```yml
on:
  push:
    branches:
    - master
```

Workflow is ran when there's a push to master

```yml
env:
  PROJECT_ID: ${{ secrets.GKE_PROJECT }}
  GKE_CLUSTER: cluster-1   # TODO: update to cluster name
  GKE_ZONE: us-central1-c  # TODO: update to cluster zone
  IMAGE: static-site
```

Change the TODOs, keep the secret as is but you can change the IMAGE to something more descriptive, it will be the image name.

```yml
jobs:
  setup-build-publish-deploy:
    name: Setup, Build, Publish, and Deploy
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
      uses: actions/checkout@v2
```

Some setup, should work as is.

```yml
    # Setup gcloud CLI
    - uses: GoogleCloudPlatform/github-actions/setup-gcloud@master
      with:
        version: '290.0.1'
        service_account_key: ${{ secrets.GKE_SA_KEY }}
        project_id: ${{ secrets.GKE_PROJECT }}

    # Configure Docker to use the gcloud command-line tool as a credential
    # helper for authentication
    - run: |-
        gcloud --quiet auth configure-docker
    # Get the GKE credentials so we can deploy to the cluster
    - run: |-
        gcloud container clusters get-credentials "$GKE_CLUSTER" --zone "$GKE_ZONE"
```

More setup: install gcloud and a mystery line. "gcloud --quiet auth configure-docker" will enable us to use google container registry <https://cloud.google.com/container-registry/>. Let's use it instead of Docker Hub just because we can. We can also run the commands here locally.

```yml
    # Build the Docker image
    - name: Build
      run: |-
        docker build \
          --tag "gcr.io/$PROJECT_ID/$IMAGE:$GITHUB_SHA" \
          --build-arg GITHUB_SHA="$GITHUB_SHA" \
          --build-arg GITHUB_REF="$GITHUB_REF" \
          .
```

Builds the image. We can drop the build args.

* ~~build the image~~
* publish the image to a container registry
* deploy the new image to our cluster

```yml
    # Push the Docker image to Google Container Registry
    - name: Publish
      run: |-
        docker push "gcr.io/$PROJECT_ID/$IMAGE:$GITHUB_SHA"
```

Publishes the image to a container registry.

* ~~build the image~~
* ~~publish the image to a container registry~~
* deploy the new image to our cluster

```yml
    # Set up kustomize
    - name: Set up Kustomize
      run: |-
        curl -sfLo kustomize https://github.com/kubernetes-sigs/kustomize/releases/download/v3.1.0/kustomize_3.1.0_linux_amd64
        chmod u+x ./kustomize
    # Deploy the Docker image to the GKE cluster
    - name: Deploy
      run: |-
        ./kustomize edit set image gcr.io/PROJECT_ID/IMAGE:TAG=gcr.io/$PROJECT_ID/$IMAGE:$GITHUB_SHA
        ./kustomize build . | kubectl apply -f -
        kubectl rollout status deployment/$IMAGE
        kubectl get services -o wide
```

What's going on here?

As you already know we need to define the image which will be deployed inside the deplyment.yaml the tag will indicate which version we want to deploy. As we're updating that would require us to update the deployment.yaml to a version that was just now, in the previous step, published.

Kustomize is a tool that helps with configuration customization and is baked into kubectl. In this case we'll use it to define which files are meaningful for Kubernetes as well as set the image and tag. This is done via a file called [kustomization.yml](https://github.com/GoogleCloudPlatform/github-actions/blob/dbbc2aaee4ded56fea9d438baacbdd875addfc3f/example-workflows/gke/kustomization.yml). In addition we should look into the [deployment.yml](https://github.com/GoogleCloudPlatform/github-actions/blob/dbbc2aaee4ded56fea9d438baacbdd875addfc3f/example-workflows/gke/deployment.yml) to have a clear picture of what's going on.

The kustomization.yml contains instructions to use the deployment.yml as well as service.yml. In addition the deployment.yml includes line `image: gcr.io/PROJECT_ID/IMAGE:TAG` which is set to the actual value for deployment in the command.

For us a new file `kustomization.yaml` in the root of the project will work. The contents will be almost indentical except have the path included `- manifests/deployment.yml` etc.

This should already work as the -k flag will expect a kustomization file. `$ kubectl apply -k .` But for deployment lets use the same convention the example had and rename our image inside the deployment.yaml "gcr.io/PROJECT_ID/IMAGE:TAG".

The last step is to add the secrets to github.

With the workflow and kustomization we can start pushing changes to our project and they will automatically be deployed. Note that the registry is [not free](https://cloud.google.com/container-registry/pricing).


<div class="exercise" markdown="1"> 
Exercise 11:

Setup automatic deployment for ... as well.
</div>

## Volumes again ##

Now we arrive at an intersection. We can either start using a Database as a Service (DBaaS) such as the Google Cloud SQL in our case or just use the PersistentVolumeClaims with our own Postgres images and let the Google Kubernetes Engine take care of storage via PersistentVolumes for us.

Both solutions are widely used.

<div class="exercise" markdown="1">
Exercise 12:

Do a pros/cons comparison of the solutions in terms of meaningful differences. This includes **at least** the required work and cost to initialize as well as maintain. Backup methods and their ease of usage should be considered as well.

Set the list into the README of the project.
</div>

<div class="exercise" markdown="1">
Exercise 13:

Use Google Cloud SQL or postgres with PersistentVolumeClaims in your project. Give a reasoning to which you chose in the README. There are no non-valid reasons, an excellent would be "because it sounded easier".
</div>

## Scaling

Scaling can be either horizontal scaling or vertical scaling. Vertical scaling is the act of increasing resources available to a pod. Horizontal scaling is what we most often mean when talking about scaling.

### Scaling pods ###

There are multiple reasons for wanting to scale an application. Most common reason is that the number of requests an application receives exceeds the number of requests that can be processed. Limitations are often either the amount of requests that a framework is intended to handle or the actual CPU or RAM.

I've prepared an application that uses up CPU resources here: `jakousa/dwk-app7:478244ce87503c4abab757b1d13db5aff10963c9`. The application accepts a query parameter to increase the time until freeing cpu via "?fibos=25", you should use values between 15 and 30.

```yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cpushredder-dep
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cpushredder
  template:
    metadata:
      labels:
        app: cpushredder
    spec:
      containers:
        - name: cpushredder
          image: jakousa/dwk-app7:0653b8f5a41156a4e08185f7694120ee51ff2026
          resources: 
            limits:
              cpu: "150m"
              memory: "100Mi"
```

Note that finally we have set the resource limits for a Deployment as well

```yml
apiVersion: v1
kind: Service
metadata:
  name: cpushredder-svc
spec:
  type: LoadBalancer
  selector:
    app: cpushredder
  ports:
    - port: 80
      protocol: TCP
      targetPort: 3001
```

Service looks completely familiar by now.

```yml
apiVersion: autoscaling/v1
kind: HorizontalPodAutoscaler
metadata:
  name: cpushredder-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cpushredder-dep
  minReplicas: 1
  maxReplicas: 6
  targetCPUUtilizationPercentage: 50
```

HorizontalPodAutoscaler automatically scales pods horizontally. The yaml here defines what is the target Deployment, how many minimum replicas and what is the maximum replica count. The target CPU Utilization is defined as well. If the CPU utilization exceeds the target then an additional replica is created until the max number of replicas.

```console
$ kubectl top pod -l app=cpushredder
  NAME                               CPU(cores)   MEMORY(bytes)   
  cpushredder-dep-85f5b578d7-nb5rs   1m           20Mi       

$ kubectl get hpa
  NAME              REFERENCE                    TARGETS   MINPODS   MAXPODS   REPLICAS   AGE
  cpushredder-hpa   Deployment/cpushredder-dep   0%/50%    1         6         1          62s

$ kubectl get svc
  NAME              TYPE           CLUSTER-IP      EXTERNAL-IP      PORT(S)        AGE
  cpushredder-svc   LoadBalancer   10.31.254.209   35.228.149.206   80:32577/TCP   94s
```

After a few requests to the external ip here the application will start using more cpu. Note that if you request above the limit the pod will be taken down.

```
$ kubectl logs -f cpushredder-dep-85f5b578d7-nb5rs
  Started in port 3001
  Received a request
  started fibo with 25
  Received a request
  started fibo with 25
  Received a request
  started fibo with 25
  Fibonacci 25: 121393
  Closed
  Fibonacci 25: 121393
  Closed
  Fibonacci 25: 121393
  Closed
```

After a few requests we will see the *HorizontalPodAutoscaler* create a new replica as the CPU utilization rises. As the resources are fluctuating, sometimes very greatly due to increased resource usage on start or exit, the *HPA* will by default wait 5 minutes between downscaling attempts. If your application has multiple replicas even at 0%/50% just wait. If the wait time is set to a value that's too short for stable statistics of the resource usage the replica count may start "thrashing".

### Scaling nodes ###

Scaling nodes is a supported feature in GKE. Via the cluster autoscaling feature we can use minimum amount of nodes by requesting as many or as little as we have a need for.



## Summary ##

