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
