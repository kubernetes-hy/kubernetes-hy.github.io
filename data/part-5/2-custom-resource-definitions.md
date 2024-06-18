---
path: '/part-5/2-custom-resource-definitions'
title: 'Custom Resource Definitions'
hidden: false
---

<text-box variant='learningObjectives' name='Learning Objectives'>

After this section, you can

- Create your own Custom Resource Definitions

</text-box>

[Custom Resource Definitions](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/) (CRDs) are a way to extend Kubernetes with our own Resources. We've used a large number of them already, e.g. in [part 4](/part-4/3-gitops) we used [Application](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#applications) with ArgoCD.

They're so integral part of using Kubernetes that it's a good idea to learn how to make one ourselves.

Before we can get started we need to figure out what we want to create. So let's create a resource that can be used to create countdowns. The resource will be called "Countdown". It will have some *length* and some *delay* between executions. The execution - what happens each time the *delay* has elapsed - is left up to an image. So that someone using our CRD can create a countdown that e.g. posts a message to Twitter each time has ticked down.

As a template I'll use one provided by the [docs](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/).

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

**countdown.yaml**
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

And then:

```console
$ kubectl apply -f countdown.yaml
  countdown.stable.dwk/doomsday created

$ kubectl get cd
  NAME        LENGTH   DELAY
  doomsday    20       1200
```

Now we have a new resource. Next, let's create a new [custom controller](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/#custom-controllers) that'll start a pod that runs a container from the image and makes sure countdowns are destroyed. This will require some coding.

For the implementation, I decided to use a [Job](https://kubernetes.io/docs/concepts/workloads/controllers/job/), a resource familiar to us from [part 2](part-2/4-statefulsets-and-jobs#jobs-and-cronjobs).
Pods created by Jobs are intended to run once until completion. However, neither the completed Jobs nor the Pods are removed automatically. Those are preserved so that the execution logs can be reviewed after job execution.

Our controller has to do 3 things:

- Create a Job from a Countdown
- Reschedule Jobs until the number of executions defined in Countdown (the _length_) has been completed.
- Clean all Jobs and Pods after the execution

To implement the controller we need to do some low-level stuff and access the Kuberneter directly using the REST APIs.

By listening to the Kubernetes API at `/apis/stable.dwk/v1/countdowns?watch=true` we will receive an ADDED for every Countdown object in the cluster. Then creating a job can be done by parsing the data from the message and POSTing a valid payload to `/apis/batch/v1/namespaces/<namespace>/jobs`.

For jobs, we'll listen to `/apis/batch/v1/jobs?watch=true` and wait for MODIFIED event where the success state is set to true and update the labels for the jobs to store the status. To delete a Job and its Pod we can send a delete request to `/api/v1/namespaces/<namespace>/pods/<pod_name>` and `/apis/batch/v1/namespaces/<namespace>/jobs/<job_name>`

And finally, we can remove the countdown with a delete request to `/apis/stable.dwk/v1/namespaces/<namespace>/countdowns/<countdown_name>`.

A version of this controller can be found [here](https://github.com/kubernetes-hy/material-example/tree/master/app10). It has a readily built image `jakousa/dwk-app10-controller:sha-4256579`. We cannot just deploy it as it won't have access to the APIs. For this, we will need to define suitable access.

## RBAC ##

RBAC (Role-based access control) is an authorization method that allows us to define access for individual users, service accounts or groups by giving them roles. For our use case, we will define a ServiceAccount resource.

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

Next is defining the role and its rules. There are two types of roles: [ClusterRole](https://kubernetes.io/docs/reference/access-authn-authz/rbac/#role-and-clusterrole) and [Role](https://kubernetes.io/docs/reference/access-authn-authz/rbac/#role-and-clusterrole). Roles are namespace-specific whereas ClusterRoles can access all of the namespaces - in our case, the controller will access all countdowns in all namespaces so a ClusterRole will be required.

The rules are defined with the apiGroup, resource and verbs. For example, the jobs was `/apis/batch/v1/jobs?watch=true` so it's in the apiGroup "batch" and resource "jobs" and the verbs see [documentation](https://kubernetes.io/docs/reference/access-authn-authz/authorization/#determine-the-request-verb). Core API group is an empty string "" like in the case of pods.

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

And finally bind the ServiceAccount and the role. There are two types of bindings as well: [ClusterRoleBinding](https://kubernetes.io/docs/reference/access-authn-authz/rbac/#default-roles-and-role-bindings) and [RoleBinding](https://kubernetes.io/docs/reference/access-authn-authz/rbac/#default-roles-and-role-bindings). If we used a *RoleBinding* with a *ClusterRole* we would be able to restrict access to a single namespace. For example, if permission to access secrets is defined to a ClusterRole and we gave it via *RoleBinding* to a namespace called "test", they would only be able to access secrets in the namespace "test" - even though the role is a "ClusterRole".

In our case *ClusterRoleBinding* is required since we want the controller to access all of the namespaces from the namespace it's deployed in, in this case, namespace "default".

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

<text-box name="Choosing language for CRDs" variant="hint">

  The countdown example controller is implemented in two ways: using [Go](https://github.com/kubernetes-hy/material-example/tree/master/app10-go) and [JavaScript](https://github.com/kubernetes-hy/material-example/tree/master/app10).

  The best option is perhaps [Go](https://go.dev/) but this may not be the best place to learn a new language. The [app10-go](https://github.com/kubernetes-hy/material-example/tree/master/app10-go) README has info on what to do to get started with own CRD in Go!

</text-box>

<exercise name='Exercise 5.01: DIY CRD & Controller'>

  This exercise doesn't rely on previous exercises. You may again choose whichever technologies you want for the implementation.

  <p style="color:firebrick;">This exercise is difficult!</p>

  We need a *DummySite* resource that can be used to create an HTML page from any URL.

  1. Create a "DummySite" resource that has a string property called "website_url".

  2. Create a controller that receives a created "DummySite" object from the API

  3. Have the controller create all of the resources that are required for the functionality.

  Refer to <https://kubernetes.io/docs/reference/kubernetes-api/> and <https://kubernetes.io/docs/reference/using-api/api-concepts/> for more information on Kubernetes API, and
  <https://kubernetes.io/docs/reference/using-api/client-libraries/> for information about client libraries.

You may also take inspiration from the material example apps: [js](https://github.com/kubernetes-hy/material-example/tree/master/app10), [go](https://github.com/kubernetes-hy/material-example/tree/master/app10-go). Note that the JavaScript app does not quite utilize the features of [Kubernetes Client](https://github.com/kubernetes-client/javascript), but it calls the REST API directly.

Test that creating a DummySite resource with website_url "[https://example.com/](https://example.com/)"
 creates a copy of the website. With a more complex website your "copy" does not need to be a complete one. Eg. in https://en.wikipedia.org/wiki/Kubernetes the CSS styles can be broken:

<img src="../img/wikipedia.png">

 The controller doesn't have to work perfectly in all circumstances. The following workflow should succeed:
  1. apply role, account and binding.
  2. apply deployment.
  3. apply DummySite

</exercise>

