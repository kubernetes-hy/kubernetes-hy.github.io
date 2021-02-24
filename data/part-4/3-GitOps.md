---
path: '/part-4/3-gitops'
title: 'GitOps'
hidden: false
---

<text-box variant='learningObjectives' name='Learning Objectives'>

After this section, you can

- compare GitOps to other deployment methods

- compare traditional push deployment to a pull deployment

- implement GitOps in your Kubernetes cluster

</text-box>

An average simple deployment pipeline we have used and learned about is something like this.

1. Developer runs git push with modified code. E.g. to GitHub
2. This triggers a CI/CD service to start running. E.g. to GitHub actions
3. CI/CD service runs tests, builds an image, pushes the image to a registry and deploys the new image. E.g. to Kubernetes

This is called a push deployment. It is a descriptive name as everything is pushed forward by the previous step. There are some challenges with the push approach. For example, if we have a Kubernetes cluster that is unavailable for external connections i.e. the cluster on your local machine or any cluster we don't want to give outsiders access to. In those cases having CI/CD push the update to the cluster is not possible.

In a pull configuration, we'd have the cluster, running anywhere, **pull** the new image and deploy it automatically. Do we lose anything or increase the risk of a bug by doing so? No. The new image has been tested and built by the CI/CD. We simply relieve the CI/CD of the burden of deployment and move it to another system.

<text-box name="Watchtower" variant="hint">

If you completed DevOps with Docker you may have heard about [watchtower](https://github.com/containrrr/watchtower) which enabled us to change the last pushes of a deployment pipeline to pulls when running services with docker-compose.

</text-box>

GitOps is all about this reversal and promotes good practices for the operations side of things. This is achieved by having the state of the cluster be in a git repository. So besides handling the application deployment it will handle all changes to the cluster. This will require some additional configuration and rethinking past the tradition of server configuration. But when we get there GitOps will be the final nail in the coffin of imperative cluster management.

[Flux](https://toolkit.fluxcd.io/) will be the tool of choice. At the end our workflow should look like this:

1. Developer runs git push with modified code.
2. CI/CD service starts running.
3. CI/CD service builds and pushes new image *and* commits edit to "release" branch
4. Flux will take the state described in the release branch and set it as the state of our cluster.


To get started we'll need to get a GITHUB_TOKEN. You can follow the GitHub [guide](https://docs.github.com/en/free-pro-team@latest/github/authenticating-to-github/creating-a-personal-access-token) to click settings - developer settings - personal access tokens. And generate a token with all "repo" access rights. You may be able to avoid one or more of the access rights but we're okay with 100% access for a limited period. Save the variable for now.

Next step isn't a surprise at this point. As with most tools this time we will need to install the Flux CLI.

```console
$ curl -s https://toolkit.fluxcd.io/install.sh | sudo bash
```

or if that doesn't work read [installation guide](https://toolkit.fluxcd.io/guides/installation/).

 `flux check` will tell us if something is wrong with the cluster itself.

```console
$ flux check --pre
  ► checking prerequisites
  ✔ kubectl 1.19.0 >=1.18.0
  ✔ Kubernetes 1.19.4+k3s1 >=1.16.0
  ✔ prerequisites checks passed
```

Everything looks green. Now we'll configure our cluster and our GitOps repository. We will need the token for the next step. CLI will read it from the environment so run `export GITHUB_TOKEN=3dcb4daba731d77158cbac4dabe7ad1f2` with you own token now.

Now is a good time to make sure we are pointed at the right cluster. Bootstrapping flux to a cluster will install a lot of things. Read the following command instead of copy-pasting it. In this case, we use GitHub, the owner is your username and repository to be created is "kube-cluster-dwk". The cluster is personal (if omitted, we can set owner as organisation) and we don't need a private repo. There is a lot to configure and you can run `flux bootstrap github --help` if you're interested.

```console
$ flux bootstrap github \
    --owner=<YOUR_USERNAME> \
    --repository=kube-cluster-dwk \
    --personal \
    --private=false

  ...

  ✔ bootstrap finished
```

That's it for flux CLI. That's it for `kubectl apply` as well. Do **not** use kubectl apply in this GitOps section. At least avoid using it since we should not need it.

Clone the new repository you just created and create two new files in it *example-source.yaml* and *example-gitops-app.yaml*. We will fill them now that we have a new CRDs *GitRepository* and *Kustomization* (not to be confused with kustomize) available to us.

**example-source.yaml**
```yaml
apiVersion: source.toolkit.fluxcd.io/v1beta1
kind: GitRepository
metadata:
  name: example-repo
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/kubernetes-hy/material-example
  ref:
    branch: master
```

This one is simply the repository. We'll want to observe the master branch. The fields used here can mostly be deduced from the context but read the [documentation](https://toolkit.fluxcd.io/components/source/gitrepositories/) for other options and explanations.

**example-gitops-app.yaml**
```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1beta1
kind: Kustomization
metadata:
  name: example-gitops-app
  namespace: flux-system
spec:
  sourceRef:
    kind: GitRepository
    name: example-repo
  interval: 10m
  path: ./4-gitops/manifests # Path tells where to find the files. Excellent for "monorepos" where you have multiple different applications in one repository, like the example repository.
  prune: true # This will make sure that deleting the file will delete the resource
  validation: client # Who validates the objects. Server or the client.
```

And this is the application within that repository and takes care of the manifests. Kustomization will either look for kustomization.yaml within the path or if none found generate one that contains all Kubernetes manifests in it. Now simply `git add` both of them and push them to the repository. After a short while, you will have hashgenerator pod running

```console
$ kubectl get pods
  NAME                                 READY   STATUS    RESTARTS   AGE
  hashgenerator-dep-558c84888d-qh4t9   1/1     Running   0          13m
```

Now we've done our first deploy. We can delete it simply by deleting the files from the repository, no `kubectl delete` required. To get it to follow our updates to the application repository we will need to do configure the CI/CD of the application to update the manifest files.

Time to create a plan and then open GitHub actions. This will be a lot simpler than the one we had to deal with previously. But first, create a `kustomization.yaml` to have easier access to the image name and tag. I will be showing the example using one of the apps (4-gitops) in the [material-example repository](https://github.com/kubernetes-hy/material-example). The repository also contains the directory structure. You can copy the application or use your own as you follow the example.

**kustomization.yaml**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- manifests/deployment.yaml
images:
- name: IMAGE_PLACEHOLDER
  newName: jakousa/dwk-4-gitops-app
  newTag: fdafd7088d04892815ed037cf30ca4f61c7af2f7
```

After this and replacing the image in the `deployment.yaml` with IMAGE_PLACEHOLDER we're ready to automate updates with the following steps:

1. Build the image and push it to registry
2. Update the tag in the yaml to match the new version
3. Commit and push it to the repository

```yaml
name: Release 4-gitops-app

on:
  push:
    branches:
      - master
    paths:
      - '4-gitops/app/**'
      - '.github/workflows/gitops-app.yml'

jobs:
  build:
    name: Build
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2

    # Build and push
    - name: Publish to Registry
      uses: docker/build-push-action@v1
      with:
        repository: jakousa/dwk-4-gitops-app
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
        tags: ${{ github.sha }}
        path: 4-gitops/app

  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    needs: build

    steps:
    - uses: actions/checkout@v2

    - name: Set up Kustomize
      working-directory: 4-gitops/manifests
      run: |-
        curl -sfLo kustomize https://github.com/kubernetes-sigs/kustomize/releases/download/v3.1.0/kustomize_3.1.0_linux_amd64
        chmod u+x ./kustomize

    # Update yamls
    - name: Update yamls
      working-directory: 4-gitops/manifests
      run: |-
        ./kustomize edit set image IMAGE_PLACEHOLDER=jakousa/dwk-4-gitops-app:${{ github.sha }}

    # Commit and push
    - uses: EndBug/add-and-commit@v5
      with:
        add: '4-gitops/manifests/kustomization.yaml'
        message: New version release for gitops-app ${{ github.sha }}
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

That should take care of that. Now any updates to the source code will automatically be released.

Anything you installed with Helm can also be moved to the infrastructure repository. Read through the [documentation](https://toolkit.fluxcd.io/guides/helmreleases/) to know more.

With GitOps we achieved

* Better security
  - Nobody needs access to the cluster, not even CI/CD services. No need to share access to the cluster with collaborators; they will commit changes like everyone else.

* Better transparency
  - Everything is declared in the GitHub repository. When a new person joins the team they can check the repository; no need to pass ancient knowledge or hidden techniques as there are none.

* Better traceability
  - All changes to the cluster are version controlled. You will know exactly what was the state of the cluster and how it was changed and by whom.

* Risk reduction
  - If something breaks simply revert the cluster to a working commit. `git revert` and the whole cluster is in a previous state.

* Portability
  - Want to change to a new provider? Spin up a cluster and point it to the same repository - done your cluster is now there.

There are a few options for the GitOps setup. What we used here was having the configuration for the application in the same repository with the application itself. That required us to do some changes in the directory structure. Another option is to have the configuration separate from the source code. That approach also removes the risk of having a pipeline loop where your pipeline commits to the repository which then triggers the pipeline.

<exercise name='Exercise 4.07: GitOpsify Cluster'>

  Move your cluster configuration to GitOps.

  Validate that everything works by deleting the cluster `k3d cluster delete` and recreating it by bootstrapping with flux.

  Application deployments can still happen in the old fashioned way.

</exercise>

<exercise name='Exercise 4.08: Project v2.1'>

  Move your project to use GitOps so that you can develop to the repository and the application is automatically updated even locally!

  **This includes using SealedSecrets for all secrets**

</exercise>
