---
path: '/part-1/4-introduction-to-storage'
title: 'Introduction to Storage'
hidden: false
---

<text-box variant='learningObjectives' name='Learning Objectives'>

After this section you

- are able to use volumes to share data between two containers in a pod

- know about persistent volumes to store data on the disk of a node

</text-box>

There are two things that are known to be difficult with Kubernetes. First is networking. Thankfully we can avoid most of the networking difficulties unless we were going to setup our own cluster. If you're interested you can watch this Webinar on "[Kubernetes and Networks: Why is This So Dang Hard?](https://www.youtube.com/watch?v=GgCA2USI5iQ)" but we'll skip most of the topics discussed in the video. The other of the most difficult things is **storage**.

In part 1 we will look into a very basic method of using storage and return to this topic later. Where almost everything else in Kubernetes is very much dynamic, moving between nodes and replicating with ease, storage does not have the same possibilities. "[Why Is Storage On Kubernetes So Hard?](https://softwareengineeringdaily.com/2019/01/11/why-is-storage-on-kubernetes-is-so-hard/)" provides us a wide angle on the difficulties and the different options we have to overcome them.

There are multiple types of volumes and we'll get started with two of them.

### Simple Volume ###

Where in docker and docker-compose it would essentially mean that we had something persistent, here that is not the case. *emptyDir* volumes are shared filesystems inside a pod, this means that their lifecycle is tied to a pod. When the pod is destroyed the data is lost. In addition, simply moving the pod from another node will destroy the contents of the volume as the space is reserved from the node the pod is running on. Even with the limitations it may be used as a cache as it persists between container restarts or it can be used to share files between two containers in a pod.

Before we can get started with this, we need an application that shares data with another application. In this case, it will work as a method to share simple log files with each other. We'll need to develop the apps:

App 1 will check if /usr/src/app/files/image.jpg exists and if not download a random image and save it as image.jpg. Any HTTP request will trigger a new image generation.

App 2 will check for /usr/src/app/files/image.jpg and show it if it is available.

They share a deployment so that both of them are inside the same pod. My version is available for you to use [here](https://github.com/kubernetes-hy/material-example/blob/b9ff709b4af7ca13643635e07df7367b54f5c575/app3/manifests/deployment.yaml). The example includes ingress and service to access the application.

**deployment.yaml**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: images-dep
spec:
  replicas: 1
  selector:
    matchLabels:
      app: images
  template:
    metadata:
      labels:
        app: images
    spec:
      volumes: # Define volume
        - name: shared-image
          emptyDir: {}
      containers:
        - name: image-finder
          image: jakousa/dwk-app3-image-finder:b7fc18de2376da80ff0cfc72cf581a9f94d10e64
          volumeMounts: # Mount volume
          - name: shared-image
            mountPath: /usr/src/app/files
        - name: image-response
          image: jakousa/dwk-app3-image-response:b7fc18de2376da80ff0cfc72cf581a9f94d10e64
          volumeMounts: # Mount volume
          - name: shared-image
            mountPath: /usr/src/app/files
```

As the display is dependant on the volume we can confirm that it works by accessing the image-response and getting the image. The provided ingress used the previously opened port 8081 <http://localhost:8081>

Note that all data is lost when the pod goes down.

<exercise name='Exercise 1.10: Even more services'>

  Split the "Log output" application into two different containers within a single pod:

  One generates a new timestamp every 5 seconds and saves it into a file.

  The other reads that file and outputs it with a hash for the user to see.

  Either application can generate the hash. The reader or the writer.

</exercise>

### Persistent Volumes ###

This type of storage is what you probably had in mind when we started talking about volumes. Unfortunately, we're quite limited with the options here and will return to *PersistentVolumes* briefly in Part 2 and again in Part 3 with GKE.

The reason for the difficulty is because you should not store data with the application or create a dependency on the filesystem by the application. Kubernetes supports cloud providers very well and you can run your own storage system. During this course, we are not going to run our own storage system as that would be a huge undertaking and most likely "in real life" you are going to use something hosted by a cloud provider. This topic would probably be a part of its own, but let's scratch the surface and try something you can use to run something at home.

A *local* volume is a *PersistentVolume* that binds a path from the node to use as a storage. This ties the volume to the node.

For the _PersistentVolume_ to work you first need to create the local path in the node we are binding it to. Since our k3d cluster runs via docker let's create a directory at `/tmp/kube` in the `k3d-k3s-default-agent-0` container. This can simply be done via `docker exec k3d-k3s-default-agent-0 mkdir -p /tmp/kube`

**persistentvolume.yaml**

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: example-pv
spec:
  storageClassName: manual
  capacity:
    storage: 1Gi # Could be e.q. 500Gi. Small amount is to preserve space when testing locally
  volumeMode: Filesystem # This declares that it will be mounted into pods as a directory
  accessModes:
  - ReadWriteOnce
  local:
    path: /tmp/kube
  nodeAffinity: ## This is only required for local, it defines which nodes can access it
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - k3d-k3s-default-agent-0
```

As this is bound into that node avoid using this in production.

The type of *local* we're using now can not be dynamically provisioned. A new *PersistentVolume* needs to be defined only rarely, for example to your personal cluster once a new physical disk is added. After that, a *PersistentVolumeClaim* is used to claim a part of the storage for an application. If we create multiple *PersistentVolumeClaims* the rest will stay in Pending state, waiting for a suitable *PersistentVolume*.

**persistentvolumeclaim.yaml**

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: image-claim
spec:
  storageClassName: manual
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

Modify the previously introduced deployment to use it:

**deployment.yaml**
```yaml
# ...
    spec:
      volumes:
        - name: shared-image
          persistentVolumeClaim:
            claimName: image-claim
      containers:
        - name: image-finder
          image: jakousa/dwk-app3-image-finder:b7fc18de2376da80ff0cfc72cf581a9f94d10e64
          volumeMounts:
          - name: shared-image
            mountPath: /usr/src/app/files
        - name: image-response
          image: jakousa/dwk-app3-image-response:b7fc18de2376da80ff0cfc72cf581a9f94d10e64
          volumeMounts:
          - name: shared-image
            mountPath: /usr/src/app/files
```

And apply it with persistentvolume.yaml and persistentvolumeclaim.yaml.

```console
$ kubectl apply -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app3/manifests/deployment-persistent.yaml
```

With the previous service and ingress we can access it from http://localhost:8081. To confirm that the data is persistent we can run

```console
$ kubectl delete -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app3/manifests/deployment-persistent.yaml
  deployment.apps "images-dep" deleted
$ kubectl apply -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app3/manifests/deployment-persistent.yaml
  deployment.apps/images-dep created
```

And the same file is available again.

If you are interested in learning more about running your own storage you can check out.

* [Rook](https://rook.io/)

* [OpenEBS](https://openebs.io/)

* [StorageOS](https://storageos.com/)

* [Longhorn](https://longhorn.io/)

<exercise name='Exercise 1.11: Persisting data'>

  Let's share data between "Ping-pong" and "Log output" applications using persistent volumes. Create both a *PersistentVolume* and *PersistentVolumeClaim* and alter the *Deployment* to utilize it. As *PersistentVolume* is often maintained by cluster administrators rather than developers and are not application specific you should keep the definition for that separated.

  Save the number of requests to "Ping-pong" application into a file in the volume and output it with the timestamp and hash when sending a request to our "Log output" application. In the end, the two pods should share a persistent volume between the two applications. So the browser should display the following when accessing the "Log output" application:

  ```plaintext
  2020-03-30T12:15:17.705Z: 8523ecb1-c716-4cb6-a044-b9e83bb98e43.
  Ping / Pongs: 3
  ```

</exercise>

<exercise name='Exercise 1.12: Project v0.6'>

  Since the project looks really boring right now, let's add a picture!

  The goal is to add a daily image to the project. And every day a new image is fetched on the first request.

  Get a random picture from Lorem Picsum like `https://picsum.photos/1200` and display it in the project. Find a way to store the image so it stays the same for an entire day.

  Make sure to cache the image into a volume so that the API isn't needed for new images every time we access the application or the container crashes.

  Best way to test what happens when your container shuts down is likely by shutting down the container, so you can add logic for that as well, for testing purposes.

</exercise>

<exercise name='Exercise 1.13: Project v0.7'>

  For the project we'll need to do some coding to start seeing results in the next part.

  1. Add an input field. The input should not take todos that are over 140 characters long.

  2. Add a send button. It does not have to send the todo yet.

  3. Add a list for the existing todos with some hardcoded todos.

  Maybe something similar to this:
  <img src="../img/project-ex-113.png">

</exercise>

<quiz id="23c1e0c1-debe-4c86-9bf8-5f0786b0118e"></quiz>
