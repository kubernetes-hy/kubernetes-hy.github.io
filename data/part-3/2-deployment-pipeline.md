---
path: '/part-3/2-deployment-pipeline'
title: 'Deployment Pipeline'
hidden: false
---

<text-box variant='learningObjectives' name='Learning Objectives'>

After this section you can

- Create your own deployment pipeline to GKE with Github Actions and enable continuous delivery from a git push to production

</text-box>


Let's setup a deployment pipeline using GitHub actions. We just need something to deploy so let's create a new website.

Create a Dockerfile with the following contents:

```Dockerfile
FROM nginx:1.19-alpine

COPY index.html /usr/share/nginx/html
```

and add index.html with the following content

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

Let's make sure that everything works by doing `docker build . -t colorcontent && docker run -p 3000:80 colorcontent` to build and run it and then accessing it through [http://localhost:3000](http://localhost:3000). Next is the addition of manifests for our website.

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

Applying multiple files like this gets bothersome. We can of course point it at a directory like so: `kubectl apply -f manifests/`, but this is an excellent moment to turn our attention to Kustomize.

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

Now we can deploy this using the `-k` flag identifying that we want to use Kustomize.

```console
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

This will replace the image "IMAGE:TAG" with the one defined in _newName_. Next setting a placeholder value inside the deployment.yaml for the image:

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

Github Actions will be the CI/CD tool of choice for this course. The behavior is similar to CircleCI or even Travis which you may have used previously. Google also offers [Cloud Build](https://cloud.google.com/cloud-build), and a [step-by-step guide to deploying to GKE](https://cloud.google.com/cloud-build/docs/deploying-builds/deploy-gke) with it. You can return here to implement deployment with Cloud Build if you have credits left over after the course!

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

Next use _gcloud_ commands to configure Docker and this will enable us to push to Google Container Registry, which we'll use for no particular reason. Read more about it here <https://cloud.google.com/container-registry/>. If we wanted we could use Docker Hub instead. Note that the registry is [not free](https://cloud.google.com/container-registry/pricing) and you'll probably want to delete the images from there during and after this course.

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

<exercise name='Exercise 3.03: Project v1.4'>

  Setup automatic deployment for the project as well.

</exercise>

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

<exercise name='Exercise 3.04: Project v1.4.1'>

  Improve the deployment so that each branch creates their own environment.

</exercise>

<exercise name='Exercise 3.05: Project v1.4.2'>

  Finally create a new workflow so that deleting a branch deletes the environment.

</exercise>
