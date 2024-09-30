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

<exercise name='Exercise 5.05: Platform comparison'>

  Choose one service provider such as Rancher and compare it to another such as OpenShift.

  Decide arbitrarily which service provider is "better" and argue for it against the other service provider.

  For the submission a bullet point list is enough.

</exercise>

### Serverless ###

[Serverless](https://en.wikipedia.org/wiki/Serverless_computing) has gained a lot of popularity and it's easy to see why. Be it Google Cloud Run, Knative, OpenFaaS, OpenWhisk, Fission or Kubeless they're running on top of Kubernetes, or at least capable of doing so. The older the serverless platform the more likely it won't be running on Kubernetes. As such a statement like "Kubernetes is competing with serverless" doesn't make much sense.

As this isn't a serverless course we won't go into depth about it but serverless sounds pretty dope. That's why next we will setup a serverless platform on top of our k3d. For this let's choose [Knative](https://knative.dev/) as it's the solution [Google Cloud Run](https://cloud.google.com/blog/products/serverless/knative-based-cloud-run-services-are-ga) is based on and seems to be a competent option compared to other open-source options we have available. It also keeps us in the theme of platforms for platforms as it could be used to create your own serverless platform.

Knative has its own community-backed [runtime contract](https://github.com/knative/specs/blob/main/specs/serving/runtime-contract.md). It describes what kind of features an application must and should have to run correctly as a FaaS. An essential requirement is that the app itself must be stateless and configurable with environmental variables. This kind of open-source specification helps a project gain wider adoption. For instance, [Google Cloud Run implemented](https://ahmet.im/blog/cloud-run-is-a-knative/) the same contract.


<exercise name='Exercise 5.06: Trying Serverless'>

Install Knative Serving component to your k3d cluster.

For Knative to work locally in k3d you need to create it a cluster without Traefik:

```console
$ k3d cluster create --port 8082:30080@agent:0 -p 8081:80@loadbalancer --agents 2 --k3s-arg "--disable=traefik@server:0"
```

Follow then [this](https://knative.dev/docs/install/yaml-install/serving/install-serving-with-yaml/) guide.

You might end up in a situation like this in the step _verify the installation_:

```bash
$ get pods -n knative-serving
NAME                                      READY   STATUS             RESTARTS      AGE
activator-67855958d-w2ws8                 0/1     Running            0             64s
autoscaler-5ff4c5d679-54l28               0/1     Running            0             64s
webhook-5446675b97-2ngh6                  0/1     CrashLoopBackOff   3 (12s ago)   64s
net-kourier-controller-58b6bf4fbc-g7dlp   0/1     CrashLoopBackOff   3 (10s ago)   55s
controller-6d8b579f9-p42dx                0/1     CrashLoopBackOff   3 (6s ago)    64s
```

See the logs of a crashing pod to see how to fix the problem.

Next, try out the examples in [Deploying a Knative Service](https://knative.dev/docs/getting-started/first-service/), [Autoscaling](https://knative.dev/docs/getting-started/first-autoscale/) and [Traffic splitting](https://knative.dev/docs/getting-started/first-traffic-split/).

Note you can access the service from the host machine as follows:

```bash
curl -H "Host: hello.default.192.168.240.3.sslip.io" http://localhost:8081
```

Where _Host_ is the URL you get with the following command:

```bash
kubectl get ksvc
```

</exercise>

<exercise name='Exercise 5.07: Deploy to Serverless'>

  Make the Ping-pong application serverless.

  Reading [this](https://knative.dev/docs/serving/convert-deployment-to-knative-service/) might be helpful.

  TIP: Your application should listen on port 8080 or better yet have a `PORT` environment variable to configure this.

</exercise>

<exercise name='Exercise 5.08: Landscape'>

  Look at the CNCF Cloud Native Landscape [png](https://landscape.cncf.io/images/landscape.png) (also available as [interactive](https://landscape.cncf.io/))

  Circle the logo of every product / project you've used. It does not have to be in this course. "Used" is defined here as something that you know you were using it. Next use different color to circle those that something we used was depending on, except those already circled. Then create a list with information where they were used. Anything outside of this course context can be labeled as "outside of the course"

  For example:
  1. I used **HELM** to install Prometheus in part 2.
  2. I indirectly used **Flannel** as k3d (through k3s) uses it. But I have no clue how it works.
  3. I've used **Istio** outside of the course.

  You can follow the indirect use as deep as you want, like in the k3d -> k3s -> flannel example, but use common sense to make the final image meaningful.

</exercise>

