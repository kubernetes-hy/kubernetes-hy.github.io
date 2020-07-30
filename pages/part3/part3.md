---
layout: page
title: Part 3
inheader: yes
permalink: /part3/
order: 3
---

In this part we'll start using GKE and see a few features that we didn't have available locally. By the end of this part you will be able to

- Create your own cluster in GKE

- Create a deployment pipeline, enabling continuous delivery from a git push to production

- Have the pods in the cluster autoscale

- Have the cluster itself autoscale

## Google Kubernetes Engine ##

We have used Kubernetes distribution k3s using docker containers via k3d. In a production environment the task of maintaining a Kubernetes cluster is often left to third parties. A managed Kubernetes as a service is often the best choice as the additional work required in maintenance exceeds the benefits of a personal cluster. In some, somewhat rare, cases setting up and maintaining your own cluster is a reasonable option. A case for it would be that your company/organization already has the hardware and/or wants to stay independent from providers, one such example could be a University. 

Even in Kubernetes then the cost for running software that is rarely used may be higher than the value it generates. In such cases using [Serverless](https://en.wikipedia.org/wiki/Serverless_computing) solutions could be more cost-efficient. Kubernetes can get really expensive really fast.

Let's focus on the Google Kubernetes Engine (GKE) costs for now. Note that the GKE costs a little bit more than its competitors.

The calculator here [https://cloud.google.com/products/calculator](https://cloud.google.com/products/calculator) offers us a picture of the pricing. I decided to try a cheap option: 6 nodes in 1 zonal cluster using 1 vCPU each. The datacenter location is in Finland and I don't need a persistent disk. If we wanted less than 6 nodes why would we even use Kubernetes? The total cost for this example was 145€ - $160 per month. Adding additional services such as a Load balancer increase the cost.

During part 3 we will be using GKE either by using the student credits or the free credits offered by Google. You are responsible for making sure that the credits last for the whole part and if all of them are consumed I can not help you.

After redeeming the credits we can create a project with the billing account. The google cloud UI can be confusing. On the [resources page](https://console.cloud.google.com/cloud-resource-manager) we can create a new project and let's name it "dwk-gke" for the purposes of this course. After creating this project make sure that the project is linked to the correct billing account from the top-left dropdown and billing and then "Account Management". It should look like this (account is "DevOps with Kubernetes" and project "dwk-gke"):

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

$ kubectl cluster-info
```

Now that we have a cluster it's used almost exactly like the one we had locally. Let's apply this application that creates a random string and then serves an image based on that random string. This will create 6 replicas of the process "seedimage".

```console
$ kubectl apply -f https://raw.githubusercontent.com/kubernetes-hy/material-example/e16301c4f223099e087cc010697250e584ac2022/app6/manifests/deployment.yaml
```

Now as a warning the next step is going to add into the [cost of the cluster](https://cloud.google.com/compute/all-pricing#lb) as well. Let's add a *LoadBalancer* Service!

**service.yaml**

```yaml
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

Instead of using a LoadBalancer Service we could have used an Ingress just like we've used before. In that case the type for the service should be "NodePort".

<div style="border: lightblue 0.2em outset; padding: 0.5em 1em 0 1em;" markdown="1">
To avoid using up the credits delete the cluster whenever you do not need it

```console
$ gcloud container clusters delete dwk-cluster --zone=europe-north1-b
```

And when resuming progress create the cluster back.
```console
$ gcloud container clusters create dwk-cluster --zone=europe-north1-b
```

Closing the cluster will also remove everything you've deployed on the cluster. If you decide to take a break during an example you may have to redo it. Thankfully we have used declarative approach so continuing progress will only require you to apply the yamls.
</div>

### Persisting data in GKE ###

Google Kubernetes Engine will automatically provision a persistent disk for your PersistentVolumeClaim - just don't set the storage class. If you want you can read more about it [here](https://cloud.google.com/kubernetes-engine/docs/concepts/persistent-volumes).

{% include_relative exercises/3_01.html %}

## Deployment Pipeline ##

Let's setup a deployment pipeline using GitHub actions. We just need something to deploy so let's create a new website.

Create a Dockerfile with the following contents:

```Dockerfile
FROM nginx:1.19-alpine

COPY index.html /usr/share/nginx/html
```

and a index.html with the following content

```html
<!DOCTYPE html>
<html>
  <body style="background-color: gray;">
    <p>
      Content
    </p>
  </body>
</html>
```

Let's make sure that everything works with `docker build . -t colorcontent && docker run -p 3000:80 colorcontent` and accessing it through [http://localhost:3000](http://localhost:3000). Next is the addition of manifests for our website.

**manifests/service.yaml**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: dwk-environments-svc
spec:
  type: LoadBalancer
  selector:
    app: dwk-environments
  ports:
    - port: 80
      protocol: TCP
      targetPort: 80
```

**manifests/deployment.yaml**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dwk-environments
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dwk-environments
  template:
    metadata:
      labels:
        app: dwk-environments
    spec:
      containers:
        - name: dwk-environments
          image: jakousa/colorcontent
```

Next, to test our manifests deploy this into our cluster. Above I had pushed the built image using `docker push`.

```console
$ kubectl apply -f manifests/service.yaml
$ kubectl apply -f manifests/deployment.yaml
```

### Kustomize ###

As you may've noticed applying multiple files like this gets bothersome.

[Kustomize](https://github.com/kubernetes-sigs/kustomize) is a tool that helps with configuration customization and is baked into kubectl. In this case we'll use it to define which files are meaningful for Kubernetes.

For us a new file *kustomization.yaml* in the root of the project will work. The *kustomization.yaml* should include instructions to use the deployment.yaml and service.yaml.

**kustomization.yaml**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- manifests/deployment.yaml
- manifests/service.yaml
```

Now we can deploy this using -k flag identifying that we want to use Kustomize.

```
$ kubectl apply -k .
```

We can preview the file with `kubectl kustomize .`. Kustomize will be an essential tool for our deployment pipeline. It'll allow us to individually choose which image to use. For this let's declare the image inside the kustomization.yaml. 

**kustomization.yaml**

```yaml
...
images:
- name: PROJECT/IMAGE
  newName: jakousa/colorcontent
```

This will replace the image "IMAGE:TAG" with the one defined in newName. Next setting a placeholder value inside the deployment.yaml for the image:

**deployment.yaml**

```yaml
      ...
      containers:
        - name: dwk-environments
          image: PROJECT/IMAGE
```

Test that everything works

```console
$ kubectl kustomize .
  ...
    spec:
      containers:
      - image: jakousa/colorcontent
        name: dwk-environments
```

Kustomize has a few additional tools you can test out if you want to install it - but we'll see the usage in the next section.

### Github Actions ###

Github Actions will be the CI/CD tool of choice for this course. The behavior is similar to CircleCI or even travis which you may have used previously. Google also offers [Cloud Build](https://cloud.google.com/cloud-build), and a [step-by-step guide to deploying to GKE](https://cloud.google.com/cloud-build/docs/deploying-builds/deploy-gke) with it. You can return here to implement deployment with Cloud Build if you have credits left over after the course!

Create a file .github/workflows/main.yaml. We'll want the workflow to do 3 things:

* build the image
* publish the image to a container registry
* deploy the new image to our cluster

The initial config will look something like this:

**main.yaml**

```yaml
name: Release application

on:
  push:

env:
  GKE_CLUSTER: dwk-cluster
  GKE_ZONE: europe-north1-b
  IMAGE: dwk-environments
```

We set the workflow to run whenever changes are pushed to the repository and set the environment variables accordingly - we'll need them later on.

Next is adding the jobs. For simplicity we'll add everything into a single job that'll build, publish and deploy.

```yaml
...
jobs:
  build-publish-deploy:
    name: Build, Publish and Deploy
    runs-on: ubuntu-latest

    steps:
    - name: Checkout
      uses: actions/checkout@v2
```

This sets the environment for the job and triggers the [checkout action](https://github.com/actions/checkout) as the first step.

Next we'll use some additional actions, mainly from [GoogleCloudPlatform](https://github.com/GoogleCloudPlatform/github-actions) that are designed to help on deployments to Google Cloud.

```yaml
...
    - uses: GoogleCloudPlatform/github-actions/setup-gcloud@master
      with:
        service_account_key: ${{ secrets.GKE_SA_KEY }}
        project_id: ${{ secrets.GKE_PROJECT }}
```

The secrets here are not from the environment variables but are included into the project from Github. Read their guide [here](https://docs.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets). The *GKE_SA_KEY* is a service account key that is required to access the google cloud services - read their guide for it [here](https://cloud.google.com/iam/docs/creating-managing-service-account-keys).

Next use gcloud to configure Docker and this will enable us to push to Google Container Registry, which we'll use for no particular reason. Read more about it here <https://cloud.google.com/container-registry/>. If we wanted we could use Docker Hub instead. Note that the registry is [not free](https://cloud.google.com/container-registry/pricing) and you'll probably want to delete the images from there during and after this course.

```yaml
...
    - run: gcloud --quiet auth configure-docker
```

And then we'll set the kubectl access to the right cluster, as defined in the environment variables.

```yaml
...
    - run: gcloud container clusters get-credentials "$GKE_CLUSTER" --zone "$GKE_ZONE"
```

And finally let's write out the desired image with a tag. The image in this case will be `gcr.io/PROJECT_ID/IMAGE:GITHUB_BRANCH-GITHUB_SHA` and stored to the environment value IMAGE_WITH_TAG.

```yaml
...
    - name: Create image name and tag
      run: echo "::set-env name=IMAGE_WITH_TAG::gcr.io/${{ secrets.GKE_PROJECT }}/$IMAGE:${GITHUB_REF#refs/heads/}-$GITHUB_SHA"
```

Now the setup is done and next is building the image:

```yaml
...
    - name: Build
      run: docker build --tag "$IMAGE_WITH_TAG" .
```

Publish similarily:

```yaml
...
    - name: Publish
      run: docker push "$IMAGE_WITH_TAG"
```

And finally deployment. We'll setup Kustomize first:

```yaml
...
    - name: Set up Kustomize
      run: |-
        curl -sfLo kustomize https://github.com/kubernetes-sigs/kustomize/releases/download/v3.1.0/kustomize_3.1.0_linux_amd64
        chmod u+x ./kustomize
```

And with Kustomize we can set the image PROJECT/IMAGE as the one we just published and apply it. Finally we'll preview the *rollout* and confirm that the release was a success.

```yaml
...
    - name: Deploy
      run: |-
        ./kustomize edit set image PROJECT/IMAGE=$IMAGE_WITH_TAG
        kubectl apply -k .
        kubectl rollout status deployment $IMAGE
```

{% include_relative exercises/3_02.html %}

### Separate environment for each branch ###

A quite popular choice when using a deployment pipeline is having a separate environment for every branch - especially when using feature branching.

Let's implement our own version of this. Let's extend the previously defined pipeline. Previously this was our final state:

**main.yaml**

```yaml
name: Release application

on:
  push:

env:
  GKE_CLUSTER: dwk-cluster
  GKE_ZONE: europe-north1-b
  IMAGE: dwk-environments

jobs:
  setup-build-publish-deploy:
    name: Setup, Build, Publish, and Deploy
    runs-on: ubuntu-latest

    steps:
    - name: Checkout
      uses: actions/checkout@v2

    - name: Create image name and tag
      run: echo "::set-env name=IMAGE_WITH_TAG::gcr.io/${{ secrets.GKE_PROJECT }}/$IMAGE:${GITHUB_REF#refs/heads/}-$GITHUB_SHA"

    - uses: GoogleCloudPlatform/github-actions/setup-gcloud@master
      with:
        service_account_key: ${{ secrets.GKE_SA_KEY }}
        project_id: ${{ secrets.GKE_PROJECT }}

    - run: gcloud --quiet auth configure-docker

    - run: gcloud container clusters get-credentials "$GKE_CLUSTER" --zone "$GKE_ZONE"

    - name: Build
      run: docker build --tag "$IMAGE_WITH_TAG" .
  
    - name: Publish
      run: docker push "$IMAGE_WITH_TAG"

    - name: Set up Kustomize
      run: |-
        curl -sfLo kustomize https://github.com/kubernetes-sigs/kustomize/releases/download/v3.1.0/kustomize_3.1.0_linux_amd64
        chmod u+x ./kustomize

    - name: Deploy
      run: |-
        ./kustomize edit set image PROJECT/IMAGE=$IMAGE_WITH_TAG
        kubectl apply -k .
        kubectl rollout status deployment $IMAGE
```

What we'll want to do is deploy each branch into a separate namespace so that each branch has its own separate environment.
Kustomize has a method to set the namespace. *${GITHUB_REF#refs/heads/}* will be the branch name.

```console
./kustomize edit set namespace ${GITHUB_REF#refs/heads/}
```

But this will error as there's no namespace defined. So we need to add a creation of a namespace

```console
kubectl create namespace ${GITHUB_REF#refs/heads/} || true
```

But since now we're namespaced the rollout status will fail. So let's set the namespace to be used

```console
kubectl config set-context --current --namespace=${GITHUB_REF#refs/heads/}
```

So in the correct order and inside the Deploy:

```yaml
    - name: Deploy
      run: |-
        kubectl create namespace ${GITHUB_REF#refs/heads/} || true
        kubectl config set-context --current --namespace=${GITHUB_REF#refs/heads/}
        ./kustomize edit set namespace ${GITHUB_REF#refs/heads/}
        ./kustomize edit set image PROJECT/IMAGE=$IMAGE_WITH_TAG
        kubectl apply -k .
        kubectl rollout status deployment $IMAGE
```

To test this, edit the index.html and publish the changes to a new branch.

The next step would be to configure the domain names for each branch so that we'd have "www.example.com" as the production and e.g. "feat_x.example.com" as the feat_x branch. If you have any credits left after the course you can return here and implement it. Google Cloud DNS and this [guide](https://cloud.google.com/kubernetes-engine/docs/tutorials/configuring-domain-name-static-ip) can get you started.

{% include_relative exercises/3_03.html %}

{% include_relative exercises/3_04.html %}

## Volumes again ##

Now we arrive at an intersection. We can either start using a Database as a Service (DBaaS) such as the Google Cloud SQL in our case or just use the PersistentVolumeClaims with our own Postgres images and let the Google Kubernetes Engine take care of storage via PersistentVolumes for us.

Both solutions are widely used.

{% include_relative exercises/3_05.html %}

{% include_relative exercises/3_06.html %}

## Scaling ##

Scaling can be either horizontal scaling or vertical scaling. Vertical scaling is the act of increasing resources available to a pod or a node. Horizontal scaling is what we most often mean when talking about scaling, increasing the number of pods or nodes. We'll focus on horizontal scaling.

### Scaling pods ###

There are multiple reasons for wanting to scale an application. The most common reason is that the number of requests an application receives exceeds the number of requests that can be processed. Limitations are often either the amount of requests that a framework is intended to handle or the actual CPU or RAM.

I've prepared an application that uses up CPU resources here: `jakousa/dwk-app7:478244ce87503c4abab757b1d13db5aff10963c9`. The application accepts a query parameter to increase the time until freeing CPU via "?fibos=25", you should use values between 15 and 30.

**deployment.yaml**

```yaml
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

**service.yaml**

```yaml
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

**horiziontalpodautoscaler.yaml**

```yaml
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

After a few requests to the external IP here the application will start using more CPU. Note that if you request above the limit the pod will be taken down.

```console
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

{% include_relative exercises/3_07.html %}

{% include_relative exercises/3_08.html %}

### Scaling nodes ###

Scaling nodes is a supported feature in GKE. Via the cluster autoscaling feature we can use the right amount of nodes needed.

```console
$ gcloud container clusters update dwk-cluster --zone=europe-north1-b --enable-autoscaling --min-nodes=1 --max-nodes=5
  Updated [https://container.googleapis.com/v1/projects/dwk-gke/zones/europe-north1-b/clusters/dwk-cluster].
  To inspect the contents of your cluster, go to: https://console.cloud.google.com/kubernetes/workload_/gcloud/europe-north1-b/dwk-cluster?project=dwk-gke
```

For a more robust cluster see examples on creation here: <https://cloud.google.com/kubernetes-engine/docs/concepts/cluster-autoscaler>

![]({{ "/images/part3/gke_scaling.png" | absolute_url }})

Cluster autoscaling may disrupt pods by moving them around as the number of nodes increases or decreases. To solve possible issues with this the resource [PodDisruptionBudget](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/#how-disruption-budgets-work) with which the requirements for a pod can be defined via two of the fields: *minAvailable* and *maxUnavailable*.

**poddisruptionbudget.yaml**

```yaml
apiVersion: policy/v1beta1
kind: PodDisruptionBudget
metadata:
  name: example-app-pdb
spec:
  maxUnavailable: 50%
  selector:
    matchLabels:
      app: example-app
```

This would ensure that no more than half of the pods can be unavailable at. The Kubernetes documentation states "The budget can only protect against voluntary evictions, not all causes of unavailability."

{% include_relative exercises/3_09.html %}

Submit your completed exercises through the [submission application](https://studies.cs.helsinki.fi/stats/)

## Summary ##

When deploying running software in a maintained Kubernetes service it really does get that easy. Vendor lock-in is a term commonly heard when talking about the cloud. In this section we dived into GKE and the services Google offered us. As we saw here we could migrate almost everything to Google Cloud with Cloud SQL and monitoring as the prime examples.

There's a case for and against vendor lock-in and you should evaluate whether to use a single cloud or possibly a multi-cloud strategy based on your needs. Nothing is preventing you from cherry-picking "the best" services from each provider. Often vendor lock-in doesn't show any negatives until after you're locked-in.

In the next section lets look into other practices that are included in an ecosystem like this and develop the project into its final form. We'll say goodbye to GKE but if you have any leftover credits you may want to hold onto them until the end of the course.
