---
layout: page
title: Part 5
inheader: no
permalink: /part5/
order: 5
---

Kubernetes is defined as a "container-orchestration system"  and "portable, extensible platform". In this part we'll focus on how and why its built and how to leverage the extensibility of Kubernetes. After this part you will be able to

- Create your own Custom Resource Definitions (CRDs)

- List and compare platform options.

- Setup a serverless platform (Knative) and deploy a simple workload

## Kubernetes Internals ##

Instead of thinking about Kubernetes as something completely new I've found that comparing it to an operating system helps. I'm not an expert in operating systems but we've all used them.

Kubernetes is a layer on top of which we run our applications. It takes the resources that are accessible from the layers below and manages our applications and resources. And it provides services, such as the DNS, for the applications. With this OS mindset we can also try to go the other way: You may have used a [cron](https://en.wikipedia.org/wiki/Cron) (or windows' [task scheduler](https://en.wikipedia.org/wiki/Windows_Task_Scheduler)) for saving long term backups of some applications. Here's the same thing in Kubernetes with [CronJobs](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/).

Now that we'll start talking about the internals we'll learn new insight on Kubernetes and will be able to prevent and solve problems that may result from its nature.

Due to this section being mostly a reiteration of Kubernetes documentation I will include various links the official version of the documentation - we will not setup our own Kubernetes cluster manually. If you want to go hands-on and learn to setup your own cluster with you should read and complete [Kubernetes the Hard Way](https://github.com/kelseyhightower/kubernetes-the-hard-way) by Kelsey Hightower. If you have any leftover credits from part 3 this is a great way to spend some of them.

### Controllers and Eventual Consistency ###

[Controllers](https://kubernetes.io/docs/concepts/architecture/controller/) watch the state of your cluster and then tries to move the current state of the cluster closer to the desired state. When you declare X replicas of a Pod in your deployment.yaml, a controller called Replication Controller makes sure that that will be true. There are a number of controllers for different responsibilities.

### Kubernetes Control Plane ###

[Kubernetes Control Plane](https://kubernetes.io/docs/concepts/overview/components/#control-plane-components) consists of

* etcd
  - A key-value storage that Kubernetes uses to save all cluster data.

* kube-scheduler
  - Decides on which node a Pod should be run on.

* kube-controller-manager
  - Is responsible for and runs all of the controllers.

* kube-apiserver
  - This exposes the Kubernetes Control Plane through an API

There's also cloud-controller-manager that lets you link your cluster into a cloud provider's API. If you wanted to build your own cluster on [Hetzner](https://www.hetzner.com/cloud), for example, you could use [hcloud-cloud-controller-manager](https://github.com/hetznercloud/hcloud-cloud-controller-manager) in your own cluster installed on their VMs.

### Node Components ###

Every node has a number [components](https://kubernetes.io/docs/concepts/overview/components/#node-components) that maintain the running pods.

* kubelet
  - Makes sure containers are running in a Pod

* kube-proxy
  - network proxy and maintains the network rules. Enables connections outside and inside of the cluster as well as Services to work as we've been using them.

And also the Container Runtime. We've been using Docker for this course.

### Addons ###

In addition to all of the previously mentioned, Kubernetes has [Addons](https://kubernetes.io/docs/concepts/cluster-administration/addons/) which use the same Kubernetes resources we've been using and extend Kubernetes. You can view which resources the addons have created in the `kube-system` namespace.

```console
$ kubectl -n kube-system get all
  NAME                                                            READY   STATUS    RESTARTS   AGE
  pod/event-exporter-v0.2.5-599d65f456-vh4st                      2/2     Running   0          5h42m
  pod/fluentd-gcp-scaler-bfd6cf8dd-kmk2x                          1/1     Running   0          5h42m
  pod/fluentd-gcp-v3.1.1-9sl8g                                    2/2     Running   0          5h41m
  pod/fluentd-gcp-v3.1.1-9wpqh                                    2/2     Running   0          5h41m
  pod/fluentd-gcp-v3.1.1-fr48m                                    2/2     Running   0          5h41m
  pod/heapster-gke-9588c9855-pc4wr                                3/3     Running   0          5h41m
  pod/kube-dns-5995c95f64-m7k4j                                   4/4     Running   0          5h41m
  pod/kube-dns-5995c95f64-rrjpx                                   4/4     Running   0          5h42m
  pod/kube-dns-autoscaler-8687c64fc-xv6p6                         1/1     Running   0          5h41m
  pod/kube-proxy-gke-dwk-cluster-default-pool-700eba89-j735       1/1     Running   0          5h41m
  pod/kube-proxy-gke-dwk-cluster-default-pool-700eba89-mlht       1/1     Running   0          5h41m
  pod/kube-proxy-gke-dwk-cluster-default-pool-700eba89-xss7       1/1     Running   0          5h41m
  pod/l7-default-backend-8f479dd9-jbv9l                           1/1     Running   0          5h42m
  pod/metrics-server-v0.3.1-5c6fbf777-lz2zh                       2/2     Running   0          5h41m
  pod/prometheus-to-sd-jw9rs                                      2/2     Running   0          5h41m
  pod/prometheus-to-sd-qkxvd                                      2/2     Running   0          5h41m
  pod/prometheus-to-sd-z4ssv                                      2/2     Running   0          5h41m
  pod/stackdriver-metadata-agent-cluster-level-5d8cd7b6bf-rfd8d   2/2     Running   0          5h41m
  
  NAME                           TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)         AGE
  service/default-http-backend   NodePort    10.31.251.116   <none>        80:31581/TCP    5h42m
  service/heapster               ClusterIP   10.31.247.145   <none>        80/TCP          5h42m
  service/kube-dns               ClusterIP   10.31.240.10    <none>        53/UDP,53/TCP   5h42m
  service/metrics-server         ClusterIP   10.31.249.74    <none>        443/TCP         5h42m
  
  NAME                                      DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR                                                              AGE
  daemonset.apps/fluentd-gcp-v3.1.1         3         3         3       3            3           beta.kubernetes.io/fluentd-ds-ready=true,beta.kubernetes.io/os=linux       5h42m
  daemonset.apps/metadata-proxy-v0.1        0         0         0       0            0           beta.kubernetes.io/metadata-proxy-ready=true,beta.kubernetes.io/os=linux   5h42m
  daemonset.apps/nvidia-gpu-device-plugin   0         0         0       0            0           <none>                                                                     5h42m
  daemonset.apps/prometheus-to-sd           3         3         3       3            3           beta.kubernetes.io/os=linux                                                5h42m
  
  NAME                                                       READY   UP-TO-DATE   AVAILABLE   AGE
  deployment.apps/event-exporter-v0.2.5                      1/1     1            1           5h42m
  deployment.apps/fluentd-gcp-scaler                         1/1     1            1           5h42m
  deployment.apps/heapster-gke                               1/1     1            1           5h42m
  deployment.apps/kube-dns                                   2/2     2            2           5h42m
  deployment.apps/kube-dns-autoscaler                        1/1     1            1           5h42m
  deployment.apps/l7-default-backend                         1/1     1            1           5h42m
  deployment.apps/metrics-server-v0.3.1                      1/1     1            1           5h42m
  deployment.apps/stackdriver-metadata-agent-cluster-level   1/1     1            1           5h42m
  
  NAME                                                                  DESIRED   CURRENT   READY   AGE
  replicaset.apps/event-exporter-v0.2.5-599d65f456                      1         1         1       5h42m
  replicaset.apps/fluentd-gcp-scaler-bfd6cf8dd                          1         1         1       5h42m
  replicaset.apps/heapster-gke-58bf4cb5f5                               0         0         0       5h42m
  replicaset.apps/heapster-gke-9588c9855                                1         1         1       5h41m
  replicaset.apps/kube-dns-5995c95f64                                   2         2         2       5h42m
  replicaset.apps/kube-dns-autoscaler-8687c64fc                         1         1         1       5h42m
  replicaset.apps/l7-default-backend-8f479dd9                           1         1         1       5h42m
  replicaset.apps/metrics-server-v0.3.1-5c6fbf777                       1         1         1       5h41m
  replicaset.apps/metrics-server-v0.3.1-8559697b9c                      0         0         0       5h42m
  replicaset.apps/stackdriver-metadata-agent-cluster-level-5d8cd7b6bf   1         1         1       5h41m
  replicaset.apps/stackdriver-metadata-agent-cluster-level-7bd5ddd849   0         0         0       5h42m
```

To get a complete picture of how each part communicates with each other "[what happens when k8s](https://github.com/jamiehannaford/what-happens-when-k8s)" explores what happens when you do `kubectl run nginx --image=nginx --replicas=3` shedding some more light on the magic that happens behind the scenes.

## Self-healing ##

Back in part 1 we talked a little about the "self-healing" nature of Kubernetes and how pods can be deleted and they're automatically recreated. 

Let's see what happens if we delete a node that has a pod in it. Let's first deploy the pod, a web application with ingress from part 1, confirm that it's running and then see which pod has it running.

```console
$ kubectl apply -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app2/manifests/deployment.yaml \
                -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app2/manifests/ingress.yaml \
                -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app2/manifests/service.yaml
  deployment.apps/hashresponse-dep created
  ingress.extensions/dwk-material-ingress created
  service/hashresponse-svc created

$ curl localhost:8081
9eaxf3: 8k2deb

$ kubectl describe po hashresponse-dep-57bcc888d7-5gkc9 | grep 'Node:'
  Node:         k3d-k3s-default-agent-1/172.30.0.2
```

In this case it's in agent-1. Let's make the node go "offline" with pause:

```console
$ docker ps
  CONTAINER ID        IMAGE                      COMMAND                  CREATED             STATUS              PORTS                                           NAMES
  5c43fe0a936e        rancher/k3d-proxy:v3.0.0   "/bin/sh -c nginx-pr…"   10 days ago         Up 2 hours          0.0.0.0:8081->80/tcp, 0.0.0.0:50207->6443/tcp   k3d-k3s-default-serverlb
  fea775395132        rancher/k3s:latest         "/bin/k3s agent"         10 days ago         Up 2 hours                                                          k3d-k3s-default-agent-1
  70b68b040360        rancher/k3s:latest         "/bin/k3s agent"         10 days ago         Up 2 hours          0.0.0.0:8082->30080/tcp                         k3d-k3s-default-agent-0
  28cc6cef76ee        rancher/k3s:latest         "/bin/k3s server --t…"   10 days ago         Up 2 hours                                                          k3d-k3s-default-server-0

$ docker pause k3d-k3s-default-agent-1
k3d-k3s-default-agent-1
```

Now wait for a while and this should be the new state:

```console
$ kubectl get po
NAME                                READY   STATUS        RESTARTS   AGE
hashresponse-dep-57bcc888d7-5gkc9   1/1     Terminating   0          15m
hashresponse-dep-57bcc888d7-4klvg   1/1     Running       0          30s

$ curl localhost:8081
6xluh2: ta0ztp
```

What did just happen? Read [this explanation on how kubernetes handles offline nodes](https://duske.me/how-kubernetes-handles-offline-nodes/)

Well then, what happens if you delete the only control-plane node? Nothing good. In our local cluster it's our single point of failure. See Kubernetes documentation for "[Options for Highly Available topology](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/ha-topology/)" to avoid getting the whole cluster crippled by a single faulty hardware.

## Custom Resource Definitions ##

We've used a number of CRDs, Custom Resource Definitions, previously. They are a way to extend Kubernetes with our own Resources. So let us do just that and extend Kubernetes! There's another option for [API Aggregation](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/apiserver-aggregation/) but that's left outside of the course. 

We'll want a resource that counts down to 0. So let's start by defining a resource called "Countdown" - as a template I'll use one provided by the [docs](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/).

**resourcedefinition.yaml**
```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  # name must match the spec fields below, and be in the form: <plural>.<group>
  name: countdowns.stable.dwk
spec:
  # group name to use for REST API: /apis/<group>/<version>
  group: stable.dwk
  # either Namespaced or Cluster
  scope: Namespaced
  names:
    # kind is normally the CamelCased singular type. Your resource manifests use this.
    kind: Countdown
    # plural name to be used in the URL: /apis/<group>/<version>/<plural>
    plural: countdowns
    # singular name to be used as an alias on the CLI and for display
    singular: countdown
    # shortNames allow shorter string to match your resource on the CLI
    shortNames:
    - cd
  # list of versions supported by this CustomResourceDefinition
  versions:
    - name: v1
      # Each version can be enabled/disabled by Served flag.
      served: true
      # One and only one version must be marked as the storage version.
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                length:
                  type: integer
                delay:
                  type: integer
                image:
                  type: string
      additionalPrinterColumns:
        - name: Length
          type: integer
          description: The length of the countdown
          jsonPath: .spec.length
        - name: Delay
          type: integer
          description: The length of time (ms) between executions
          jsonPath: .spec.delay
```

Now we can create our own Countdown:

```yaml
apiVersion: stable.dwk/v1
kind: Countdown
metadata:
  name: doomsday
spec:
  length: 20
  delay: 1200
  image: jakousa/dwk-app10:sha-84d581d
```

And then..

```console
$ kubectl apply -f countdown.yaml
  countdown.stable.dwk/doomsday created

$ kubectl get cd
  NAME        LENGTH   DELAY
  doomsday    20       1200
```

Now we have a new resource. Next let's create a new custom controller that'll start a pod that runs a container from the image and makes sure countdowns are destroyed. This will require some coding.

For the implementation I decided on a Kubernetes resource called *Jobs*. *Jobs* are a resource that creates a pod just like the Deployments we're now familiar with. Pods created by Jobs are intended to run once until completion, however they are not removed automatically and neither are the Pods created from a Job removed with the Job. The Pods are preserved so that the execution logs can be reviewed after job execution. Excellent use cases for Jobs are, for example, backup operations.

So our controller has to do 3 things:

- Create Job from a Countdown
- Reschedule Jobs until the number of executions defined in Countdown have been completed.
- Clean all Jobs and Pods after execution

By listening to the Kubernetes API at `/apis/stable.dwk/v1/countdowns?watch=true` we will receive an ADDED for every Countdown object in the cluster. Then creating a job is just parsing the data from the message and POSTing a valid payload to `/apis/batch/v1/namespaces/<namespace>/jobs`.

For jobs we'll listen to `/apis/batch/v1/jobs?watch=true` and wait for MODIFIED event where the success state is set to true and update the labels for the jobs to store the status. To delete a job and its pod we can send delete request to `/api/v1/namespaces/<namespace>/pods/<pod_name>` and `/apis/batch/v1/namespaces/<namespace>/jobs/<job_name>`

And finally to delete the countdown a request to `/apis/stable.dwk/v1/namespaces/<namespace>/countdowns/<countdown_name>`.

A version of this controller has been implemented here: `jakousa/dwk-app10-controller:sha-4256579`. But we cannot simply deploy it as it won't have access to the APIs. For this we will need to define suitable access.

## RBAC ##

RBAC (Role-based access control) is an authorization method that allows us to define access for individual users, service accounts or groups by giving them roles. For our use case we will define a ServiceAccount resource.

**serviceaccount.yaml**

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: countdown-controller-account
```

and then specify the *serviceAccountName* for the deployment

**deployment.yaml**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: countdown-controller-dep
spec:
  replicas: 1
  selector:
    matchLabels:
      app: countdown-controller
  template:
    metadata:
      labels:
        app: countdown-controller
    spec:
      serviceAccountName: countdown-controller-account
      containers:
        - name: countdown-controller
          image: jakousa/dwk-app10-controller:sha-4256579
```

Next is defining the role and its rules. There are two types of roles: *ClusterRole* and *Role*. Roles are namespace specific whereas ClusterRoles can access all of the namespaces - in our case the controller will access all countdowns in all namespaces so a ClusterRole will be required.

The rules are defined with the apiGroup, resource and verbs. For example the jobs was `/apis/batch/v1/jobs?watch=true` so it's in the apiGroup "batch" and resource "jobs" and the verbs see [documentation](https://kubernetes.io/docs/reference/access-authn-authz/authorization/#determine-the-request-verb). Core api group is an empty string "" like in the case of pods.

**clusterrole.yaml**

```yaml
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: countdown-controller-role
rules:
- apiGroups: [""]
  # at the HTTP level, the name of the resource for accessing Pod
  # objects is "pods"
  resources: ["pods"]
  verbs: ["get", "list", "delete"]
- apiGroups: ["batch"]
  # at the HTTP level, the name of the resource for accessing Job
  # objects is "jobs"
  resources: ["jobs"]
  verbs: ["get", "list", "watch", "create", "delete"]
- apiGroups: ["stable.dwk"]
  resources: ["countdowns"]
  verbs: ["get", "list", "watch", "create", "delete"]
```

And finally bind the ServiceAccount and the role. There are two types of bindings as well. *ClusterRoleBinding* and *RoleBinding*. If we used a *RoleBinding* with a *ClusterRole* we would be able to restrict access to a single namespace. For example, if permission to access secrets is defined to a ClusterRole and we gave it via *RoleBinding* to a namespace called "test" they would only be able to access secrets in the namespace "test" - even though the role is a "ClusterRole".

In our case *ClusterRoleBinding* is required since we want the controller to access all of the namespaces from the namespace it's deployed in, in this case namespace "default".

**clusterrolebinding.yaml**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: countdown-rolebinding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: countdown-controller-role
subjects:
- kind: ServiceAccount
  name: countdown-controller-account
  namespace: default
```

After deploying all of that we can check logs after applying a countdown. (You may have to delete the pod to have it restart in case it didn't have access and it got stuck)

```console
$ kubectl logs countdown-controller-dep-7ff598ffbf-q2rp5
  > app10@1.0.0 start /usr/src/app
  > node index.js
  
  Scheduling new job number 20 for countdown doomsday to namespace default
  Scheduling new job number 19 for countdown doomsday to namespace default
  ...
  Countdown ended. Removing countdown.
  Doing cleanup
```

{% include_relative exercises/5_01.html %}

## Service Meshes ##

Very often you'll hear about a concept "Service Mesh". Service meshes are quite complex and have a large feature set. During parts 1 to 4 we have implemented a few features that service meshes would have offered out of the box. The following video by Microsoft Developer is an excellent walkthrough of all of the features a service mesh has.

<iframe width="560" height="315" src="https://www.youtube.com/embed/izVWk7rYqWI" frameborder="0" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

For incoming and outgoing traffic and for communication between services it can:

- Secure the communication
- Manage traffic
- Monitor traffic, sending logs and metrics to e.g. Prometheus

So a service mesh is an **extremely** powerful tool. If we started using service mesh like Istio in part 1 we may have been able to skip using traefik, skip some of our DIY monitoring solutions, and achieved canary releases without Argo Rollouts. On the other hand, we did do all that without a service meshes.

Let's install a service mesh and test the features. Our choice will be [Linkerd](https://linkerd.io/), mainly because it's lightweight compared to Istio. Once again they have their own CLI tool to help us, follow the [getting started](https://linkerd.io/2/getting-started/) guide until Step 4. 

> We are actually simply following through the whole gettings started guide, so you can read through it if you wish.

Let's look at our application, this time we'll use this microservice application for voting emojis: [https://github.com/BuoyantIO/emojivoto](https://github.com/BuoyantIO/emojivoto).

```console
$ kubectl apply -f https://raw.githubusercontent.com/BuoyantIO/emojivoto/main/kustomize/deployment/ns.yml \
                -f https://raw.githubusercontent.com/BuoyantIO/emojivoto/main/kustomize/deployment/web.yml \
                -f https://raw.githubusercontent.com/BuoyantIO/emojivoto/main/kustomize/deployment/emoji.yml \
                -f https://raw.githubusercontent.com/BuoyantIO/emojivoto/main/kustomize/deployment/voting.yml \
                -f https://raw.githubusercontent.com/BuoyantIO/emojivoto/main/kustomize/deployment/vote-bot.yml

$ kubectl get all -n emojivoto
  NAME                            READY   STATUS    RESTARTS   AGE
  pod/web-7bcb54cb8b-cjw7d        1/1     Running   1          3d21h
  pod/emoji-686f74d889-rcdsh      1/1     Running   1          3d21h
  pod/vote-bot-74d97c76c6-pcsfl   1/1     Running   1          3d21h
  pod/voting-56847f699b-2nzqn     1/1     Running   1          3d21h
  
  NAME                 TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)             AGE
  service/web-svc      ClusterIP   10.43.248.111   <none>        80/TCP              3d21h
  service/emoji-svc    ClusterIP   10.43.110.235   <none>        8080/TCP,8801/TCP   3d21h
  service/voting-svc   ClusterIP   10.43.111.57    <none>        8080/TCP,8801/TCP   3d21h
  
  NAME                       READY   UP-TO-DATE   AVAILABLE   AGE
  deployment.apps/emoji      1/1     1            1           3d21h
  deployment.apps/vote-bot   1/1     1            1           3d21h
  deployment.apps/web        1/1     1            1           3d21h
  deployment.apps/voting     1/1     1            1           3d21h
```

Here we see the "vote-bot" deployment that automatically generates traffic. The README tells us that it votes Donut 🍩 15% of the time and the rest randomly.

Since it already has a service we're only missing an ingress.

```yaml
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: web-ingress
  namespace: emojivoto
spec:
  rules:
  - http:
      paths:
      - backend:
          serviceName: web-svc
          servicePort: 80
```

And it becomes available for us in [http://localhost:8081](http://localhost:8081). However, there's something strange going on! You can figure it out by watching the leaderboards and knowing where the votes are going, or by clicking every single emoji by yourself.

Let's see if there's a better way to detect the behavior and figure out what's wrong. Open linkerd with 

```
$ linkerd dashboard
```

it should open your browser window. Click the "emojivoto" namespace (to reach /namespaces/emojivoto) we'll notice that the resources in emojivoto namespace are not in the service mesh yet. This is due to the fact that they do not have the sidecar container in the pods. Let's add Linkerd with the following

```
$ kubectl get -n emojivoto deploy -o yaml \
    | linkerd inject - \
    | kubectl apply -f -
```

You can run the rows independently to see what they do. The first will output all deployments in emojivoto namespace. The `inject` on the second will add an annotation to instruct Linkerd to add the sidecar proxy container. Finally the kubectl apply will apply the modified deployments.

If you now look at the dashboard you'll see a lot more information as the old deployments were replaced by the meshed ones. We also notice that success rate is less than stellar.

Two services have success rate below 100%. As the _web_ is most likely just propagating the error from _voting_ we can click either of the services and you should quickly see which request is failing.

There's a lot more service meshes offer.

{% include_relative exercises/5_02.html %}

{% include_relative exercises/5_03.html %}


## Beyond Kubernetes ##

Finally as Kubernetes is a platform we'll go over a few popular building blocks that use Kubernetes.

[OpenShift](https://www.openshift.com/) is an "enterprise" Kubernetes ([Red Hat OpenShift Overview](https://developers.redhat.com/products/openshift/overview)). Claiming that you don't have Kubernetes because you have OpenShift would be equal to claiming ["I don't have an engine. I have a car!"](https://www.openshift.com/blog/enterprise-kubernetes-with-openshift-part-one). For other options for production-ready Kubernetes see [Rancher](https://rancher.com/), which you might have seen before in this page [https://github.com/rancher/k3d](https://github.com/rancher/k3d), and [Anthos GKE](https://cloud.google.com/anthos/gke), which might also sound familiar. They are all options when you're making the crucial decision between which Kubernetes distribution you want or would you like to use a managed service.

{% include_relative exercises/5_04.html %}

### Serverless ###

[Serverless](https://en.wikipedia.org/wiki/Serverless_computing) has gained a lot of popularity and it's easy to see why. Be it Google Cloud Run, Knative, OpenFaaS, OpenWhisk, Fission or Kubeless they're running on top of Kubernetes, or atleast capable of doing so. The older the serverless platform the more likely it won't be running on Kubernetes. In the light of this a discussions if Kubernetes is competing with serverless doesn't make much sense.

As this isn't a serverless course we won't go into depth about it but serverless sounds pretty dope. So next let's setup a serverless platform on our k3d because that's something we can do. For this let's choose [Knative](https://knative.dev/) for no particular reason other than that it sounds great.

We will follow [this guide](https://knative.dev/docs/install/any-kubernetes-cluster/) to install "Serving" component of Knative. This will require us to choose a networking layer from the 6 offered. We will choose Ambassador, for no particular reason. For Ambassador and Knative to work locally in k3d we'll need to create our cluster without the traefik ingress.

```console
$ k3d cluster create --port '8082:30080@agent[0]' -p 8081:80@loadbalancer --agents 2 --k3s-server-arg '--no-deploy=traefik'
```

Now installing Knative is pretty straight forward CRDs and core:

```console
$ kubectl apply -f https://github.com/knative/serving/releases/download/v0.17.0/serving-crds.yaml
  ...

$ kubectl apply -f https://github.com/knative/serving/releases/download/v0.17.0/serving-core.yaml
  ...
```

That's it. Well, if we wanted to run something that we'll never access that is it. Next we'll install Ambassador.

## Ambassador ##

Ambassador is an API gateway. It is the first step inbound connections touch. Previously we used traefik for the job, but "[Traefik as Knative Ingress?](https://github.com/traefik/traefik/issues/5081)" is still an open issue. You can read more about API gateways from learnk8s [here](https://learnk8s.io/kubernetes-ingress-api-gateway) 

```console
$ kubectl create namespace ambassador

$ kubectl apply --namespace ambassador \
  --filename https://getambassador.io/yaml/ambassador/ambassador-crds.yaml \
  --filename https://getambassador.io/yaml/ambassador/ambassador-rbac.yaml \
  --filename https://getambassador.io/yaml/ambassador/ambassador-service.yaml
```

Give Ambassador required permissions

```console
$ kubectl patch clusterrolebinding ambassador -p '{"subjects":[{"kind": "ServiceAccount", "name": "ambassador", "namespace": "ambassador"}]}'
```

Enable Knative support

```console
$ kubectl set env --namespace ambassador  deployments/ambassador AMBASSADOR_KNATIVE_SUPPORT=true
```

And configure Knative Serving to use Ambassador

```console
$ kubectl patch configmap/config-network \
  --namespace knative-serving \
  --type merge \
  --patch '{"data":{"ingress.class":"ambassador.ingress.networking.knative.dev"}}'
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

Let's test the revisions by changing the contents of the yaml and applying it.

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

{% include_relative exercises/5_05.html %}

{% include_relative exercises/5_06.html %}

## Summary ##

Submit your completed exercises through the [submission application](https://studies.cs.helsinki.fi/stats/courses/kubernetes2020)
