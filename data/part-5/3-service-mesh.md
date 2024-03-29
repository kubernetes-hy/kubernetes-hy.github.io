---
path: '/part-5/3-service-mesh'
title: 'Service Mesh'
hidden: false
---


<text-box variant='learningObjectives' name='Learning Objectives'>

After this section you can

- Setup a service mesh and use it to monitor network traffic

</text-box>

Very often you'll hear about a concept "Service Mesh". Service meshes are quite complex and have a large feature set. During parts 1 to 4 we have implemented a few features that service meshes would have offered out of the box. The following video by Microsoft Developer is an excellent walkthrough of all of the features a service mesh has.

<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/izVWk7rYqWI" frameborder="0" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

For incoming and outgoing traffic and for communication between services it can:

- Secure the communication
- Manage traffic
- Monitor traffic, sending logs and metrics to e.g. Prometheus

So a service mesh is an **extremely** powerful tool. If we started using service mesh like Istio in part 1 we may have been able to skip using traefik, skip some of our DIY monitoring solutions, and achieved canary releases without Argo Rollouts. On the other hand, we did do all that without a service meshes.

Let's install a service mesh and test the features. Our choice will be [Linkerd](https://linkerd.io/), mainly because it's lightweight compared to Istio. Once again they have their own CLI tool to help us, follow the [getting started](https://linkerd.io/2/getting-started/) guide until Step 4.

<text-box name="Alternate sources" variant="hint">
 We are actually simply following through the whole gettings started guide, so you can read through it if you wish.
</text-box>

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

**ingress.yaml**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
  namespace: emojivoto
spec:
  rules:
  - http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-svc
            port:
              number: 80
```

And it becomes available for us in [http://localhost:8081](http://localhost:8081). However, there's something strange going on! You can figure it out by watching the leaderboards and knowing where the votes are going, or by clicking every single emoji by yourself.

Let's see if there's a better way to detect the behavior and figure out what's wrong. Linkerd offers us a dashboard through an extension called `viz`.

```
$ linkerd viz install | kubectl apply -f -
  ...

$ linkerd viz dashboard
```

it should open your browser window. Click the "emojivoto" namespace (to reach /namespaces/emojivoto) we'll notice that the resources in emojivoto namespace are not in the service mesh yet. This is due to the fact that they do not have the `sidecar container` in the pods. Sidecar containers are a commonly used pattern where a new container is added to the pod to add more functionality to the pod. Let's add Linkerd sidecars to emojivoto.

The state of the pods before:

```
$ kubectl get po -n emojivoto
  NAME                        READY   STATUS    RESTARTS   AGE
  voting-f999bd4d7-r4mct      1/1     Running   0          10m
  web-79469b946f-ksprv        1/1     Running   0          10m
  emoji-66ccdb4d86-rhcnf      1/1     Running   0          10m
  vote-bot-69754c864f-g24jt   1/1     Running   0          10m
```

The spell to add linkerd to the deployments and then apply the deployments.

```
$ kubectl get -n emojivoto deploy -o yaml \
    | linkerd inject - \
    | kubectl apply -f -
```

You can run the rows independently to see what they do. The first, `kubectl get -n emojivoto deploy -o yaml`, will output all deployments in emojivoto namespace. The `linkerd inject -` will add an annotation to instruct Linkerd to add the sidecar proxy container. Finally the kubectl apply will apply the modified deployments. Now the pods look like this:

```
kubectl get po -n emojivoto
NAME                        READY   STATUS    RESTARTS   AGE
vote-bot-6d7677bb68-qxfx9   2/2     Running   0          3m17s
web-5f86686c4d-qgxtv        2/2     Running   0          3m17s
emoji-696d9d8f95-sgzqs      2/2     Running   0          3m17s
voting-ff4c54b8d-sf99j      2/2     Running   0          3m18s
```

Also, if you now look at the dashboard you'll see a lot more information as the old deployments were replaced by the meshed ones. We also notice that success rate is less than stellar.

Two services have success rate below 100%. As the _web_ is most likely just propagating the error from _voting_ we can click either of the services and you should quickly see which request is failing.

Service meshes can be powerful tools as they can help you connect and observe your services.

<exercise name='Exercise 5.02: Project: Service Mesh Edition'>

  Deployments are mostly trivial to move to Linkerd. As we already did with emojivoto you can do with the project

  Read: https://linkerd.io/2/tasks/adding-your-service/ and move you project to Linkerd.

  Add the modified manifests (through linkerd inject) to the repository for submission.

</exercise>

<exercise name='Exercise 5.03: Learn from external material'>

  To illustrate how canary releases work in Service Meshes follow through the task here: https://linkerd.io/2/tasks/canary-release/

  During the task note how the `kubectl -k` is used with github repository.

  Use <a href="https://man7.org/linux/man-pages/man1/script.1.html">script</a> command during the exercise to have something to submit. Or just take a screenshot at the end.

</exercise>

<quiz id="5094dd11-8c82-4b61-8083-967a1ea1a409"></quiz>
