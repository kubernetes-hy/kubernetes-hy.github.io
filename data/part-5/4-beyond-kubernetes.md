---
path: '/part-5/4-beyond-kubernetes'
title: 'Beyond Kubernetes'
hidden: false
---


<text-box variant='learningObjectives' name='Learning Objectives'>

After this section you can

- List and compare platform options.

- Setup a serverless platform (Knative) and deploy a simple workload

</text-box>

Finally as Kubernetes is a platform we'll go over a few popular building blocks that use Kubernetes.

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Kubernetes is a platform for building platforms. It&#39;s a better place to start; not the endgame.</p>&mdash; Kelsey Hightower (@kelseyhightower) <a href="https://twitter.com/kelseyhightower/status/935252923721793536?ref_src=twsrc%5Etfw">November 27, 2017</a></blockquote>

[OpenShift](https://www.openshift.com/) is an "enterprise" Kubernetes ([Red Hat OpenShift Overview](https://developers.redhat.com/products/openshift/overview)). Claiming that you don't have Kubernetes because you have OpenShift would be equal to claiming ["I don't have an engine. I have a car!"](https://www.openshift.com/blog/enterprise-kubernetes-with-openshift-part-one). For other options for production-ready Kubernetes see [Rancher](https://rancher.com/), which you might have seen before in this page [https://github.com/rancher/k3d](https://github.com/rancher/k3d), and [Anthos GKE](https://cloud.google.com/anthos/gke), which might also sound familiar. They are all options when you're making the crucial decision between which Kubernetes distribution you want or would you like to use a managed service.

<exercise name='Exercise 5.04: Platform comparison'>

  Choose one service provider such as Rancher and compare it to another such as OpenShift.

  Decide arbitrarily which service provider is "better" and argue for it against the other service provider.

  For the submission a bullet point list is enough.

</exercise>

### Serverless ###

[Serverless](https://en.wikipedia.org/wiki/Serverless_computing) has gained a lot of popularity and it's easy to see why. Be it Google Cloud Run, Knative, OpenFaaS, OpenWhisk, Fission or Kubeless they're running on top of Kubernetes, or atleast capable of doing so. The older the serverless platform the more likely it won't be running on Kubernetes. As such a statement like "Kubernetes is competing with serverless" doesn't make much sense.

As this isn't a serverless course we won't go into depth about it but serverless sounds pretty dope. So next let's setup a serverless platform on our k3d because that's something we can do. For this let's choose [Knative](https://knative.dev/) as it's the one [Google Cloud Run](https://cloud.google.com/blog/products/serverless/knative-based-cloud-run-services-are-ga) is based on and seems to be a competent option compared to other open source options we have available. It also keeps us in the theme of platforms for platforms as it could be used to create your own serverless platform.

Knative has its own community-backed [runtime contract](https://github.com/knative/serving/blob/master/docs/runtime-contract.md). It describes what kind of features an application must and should have to run correctly as a FaaS. An essential requirement is that the app itself must be stateless and configurable with environmental variables. This kind of open-source specification helps a project gain wider adoption. For instance, [Google Cloud Run implemented](https://ahmet.im/blog/cloud-run-is-a-knative/) the same contract.

We will follow [this guide](https://knative.dev/docs/install/any-kubernetes-cluster/) to install "Serving" component of Knative. This will require us to choose a networking layer from the 6 offered. We will choose [Contour](https://projectcontour.io/) since it's listed as being in `Stable` state and the other Stable, Istio, has resource requirements that are quite large. For Contour and Knative to work locally in k3d we'll need to create our cluster without the traefik ingress.

```console
$ k3d cluster create --port '8082:30080@agent[0]' -p 8081:80@loadbalancer --agents 2 --k3s-server-arg '--no-deploy=traefik'
```

Now installing Knative is pretty straight forward CRDs and core:

```console
$ kubectl apply -f https://github.com/knative/serving/releases/download/v0.18.0/serving-crds.yaml
  ...

$ kubectl apply -f https://github.com/knative/serving/releases/download/v0.18.0/serving-core.yaml
  ...
```

That's it. Well, if we wanted to run something that we would never access that is it. Next we'll install Contour.

## Contour ##

Previously we used traefik for the job, but "[Traefik as Knative Ingress?](https://github.com/traefik/traefik/issues/5081)" is still an open issue.

```console
$ kubectl apply -f https://github.com/knative/net-contour/releases/download/v0.18.0/contour.yaml \
                -f https://github.com/knative/net-contour/releases/download/v0.18.0/net-contour.yaml
```

And configure Knative Serving to use Contour

```console
$ kubectl patch configmap/config-network \
  --namespace knative-serving \
  --type merge \
  --patch '{"data":{"ingress.class":"contour.ingress.networking.knative.dev"}}'
```

And that's it. We'll leave the step 4 for configuring DNS out.

#### Hello Serverless World ####

For testing purposes let's do a hello world from the Knative samples. In Knative there's another new resource called _Service_, not to be mixed up with the Kubernetes resource Service. These Services are used to manage the core Kubernetes resources

**knative-service.yaml**

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: helloworld-go
spec:
  template:
    metadata:
      name: helloworld-go-dwk-message-v1
    spec:
      containers:
        - image: gcr.io/knative-samples/helloworld-go
          env:
            - name: TARGET
              value: "DwK"
```

```console
$ kubectl apply -f knative-service.yaml
  service.serving.knative.dev/helloworld-go created
```

As previously mentioned we don't have DNS so accessing the application isn't as easy. We'll have to set the Host parameter for our requests. Find out the host from:

```console
$ kubectl get ksvc
  NAME            URL                                        LATESTCREATED                  LATESTREADY                    READY   REASON
  helloworld-go   http://helloworld-go.default.example.com   helloworld-go-dwk-message-v1   helloworld-go-dwk-message-v1   True
```

We'll need the URL field. Note also LATESTCREATED and LATESTREADY, they're revisions of the application. If we alter the knative-service.yaml it'll create new revisions where we could change between revisions.

Now we can see that there are no pods running. There may be one as Knative spins one pod during the creation of the service, wait until no helloworld-go resources are found.

```console
$ kubectl get po
  No resources found in default namespace.
```

and when we send a request to the application

```console
$ curl -H "Host: helloworld-go.default.example.com" http://localhost:8081
  Hello DwK!

$ kubectl get po
  NAME                                                       READY   STATUS    RESTARTS   AGE
  helloworld-go-dwk-message-v1-deployment-6664bc858f-jqlv6   1/2     Running   0          6s
```

it works and there are almost instantly pods ready.

If we wanted another service to access helloworld-go we would use the address `helloworld-go.default.svc.cluster.local`. Let's test this quickly with busybox by send a request from a busybox pod to our serverless helloworld:

```console
$ kubectl apply -f https://raw.githubusercontent.com/kubernetes/kubernetes/master/hack/testdata/recursive/pod/pod/busybox.yaml

$ kubectl exec -it busybox1 -- wget -qO - helloworld-go.default.svc.cluster.local
  Hello DwK!
```

Next let's test the revisions by changing the contents of the yaml and applying it.

**knative-service.yaml**
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: helloworld-go
spec:
  template:
    metadata:
      name: helloworld-go-dwk-message-v2 # v2
    spec:
      containers:
        - image: gcr.io/knative-samples/helloworld-go
          env:
            - name: TARGET
              value: "DwK-but-better" # Changed content
  traffic: # traffic enables us to split traffic between multiple revisions!
  - revisionName: helloworld-go-dwk-message-v1
    percent: 100
  - revisionName: helloworld-go-dwk-message-v2
    percent: 0
```

This created a new revision and edited the route. We can view the CRDs _Revision_ and _Route_.

```console
$ kubectl get revisions,routes
  NAME                                                        CONFIG NAME     K8S SERVICE NAME               GENERATION   READY   REASON
  revision.serving.knative.dev/helloworld-go-dwk-message-v1   helloworld-go   helloworld-go-dwk-message-v1   1            True
  revision.serving.knative.dev/helloworld-go-dwk-message-v2   helloworld-go   helloworld-go-dwk-message-v2   2            True

  NAME                                      URL                                        READY   REASON
  route.serving.knative.dev/helloworld-go   http://helloworld-go.default.example.com   True
```

So now when we send a request it's still the old message!

```console
$ curl -H "Host: helloworld-go.default.example.com" http://localhost:8081
  Hello DwK!
```

Let's set the messages between v1 and v2 at 50% each and create a new revision with the best version!

**knative-service.yaml**
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: helloworld-go
spec:
  template:
    metadata:
      name: helloworld-go-dwk-message-v3 # v3
    spec:
      containers:
        - image: gcr.io/knative-samples/helloworld-go
          env:
            - name: TARGET
              value: "DwK-but-extreme" # Changed content
  traffic: # traffic enables us to split traffic between multiple revisions!
  - revisionName: helloworld-go-dwk-message-v1
    percent: 50
  - revisionName: helloworld-go-dwk-message-v2
    percent: 50
```

Now curling will result in 50% - 50% chance between the v1 and v2 messages. But accessing v3 is currently disabled. Let's add routing to v3 by defining a Route ourselves.

**route.yaml**
```yaml
apiVersion: serving.knative.dev/v1
kind: Route
metadata:
  name: tester-route
spec:
  traffic:
    - revisionName: helloworld-go-dwk-message-v3
      percent: 100
```

```console
$ kubectl apply -f route.yaml
  route.serving.knative.dev/tester-route created

$ kubectl get routes
  NAME            URL                                        READY   REASON
  helloworld-go   http://helloworld-go.default.example.com   True
  tester-route    http://tester-route.default.example.com    True

$ curl -H "Host: tester-route.default.example.com" http://localhost:8081
  Hello DwK-but-extreme!
```

<exercise name='Exercise 5.05: Deploy to Serverless'>

  Let's test serverless by making the pingpong application serverless.

  TIP: Your application should listen on port 8080 or better yet have a `PORT` environment variable to configure this.

</exercise>

<exercise name='Exercise 5.06: Landscape'>

  Look at the CNCF Cloud Native Landscape [png](https://landscape.cncf.io/images/landscape.png) (also available as [interactive](https://landscape.cncf.io/))

  Circle the logo of every product / project you've used. It does not have to be in this course. "Used" is defined here as something that was you knew that you were using it. Next use different color to circle those that something we used was depending on, except those that were already circled. Then create a list with information where they were used. Anything outside of this course context can be labeled as "outside of the course"

  For example:
  1. I used **HELM** to install Prometheus in part 2.
  2. I indirectly used **Flannel** as k3d (through k3s) uses it. But I have no clue how it works.
  3. I've used **Istio** outside of the course.

  You can follow the indirect use as deep as you want, like in the k3d -> k3s -> flannel example, but use common sense to make the final image meaningful.

</exercise>

<quiz id="ee5f4303-5634-4157-b928-cd8e2014220b"></quiz>
