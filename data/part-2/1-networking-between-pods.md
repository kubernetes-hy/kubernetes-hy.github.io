---
path: '/part-2/1-networking-between-pods'
title: 'Networking between pods'
hidden: false
---

<text-box variant='learningObjectives' name='Learning Objectives'>

After this section

- You know about Kubernetes DNS

- Send requests from a pod to another pod within a cluster

</text-box>


In part 1 we managed to setup networking configuration to enable routing traffic from outside of the cluster to a container inside a pod. In Part 2 we'll focus on communication between applications.

Kubernetes includes a DNS service so communication between pods and containers in Kubernetes is as much of a challenge as it was with containers in docker-compose. Containers in a pod share the network. As such every other container inside a pod is accessible from `localhost`. For communication between Pods a *Service* is used as they expose the Pods as a network service.

The following creates a cluster-internal IP which will enable other pods in the cluster to access the port 8080 of "example" application from http://example-service. ClusterIP is the default type for a Service.

**service.yaml**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: example-service
spec:
  type: ClusterIP
  selector:
    app: example
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 8080
```

> Alternatively each Pod has an IP created by Kubernetes

<exercise name='Exercise 2.01: Connecting pods'>

  Connect the main application and ping/pong application. Instead of sharing data via files use HTTP endpoints to respond with the number of pongs. Deprecate all the volume between the two applications for the time being.

  The output will stay the same:

  ```
  2020-03-30T12:15:17.705Z: 8523ecb1-c716-4cb6-a044-b9e83bb98e43.
  Ping / Pongs: 3
  ```

</exercise>

<exercise name='Exercise 2.02: Project v1.0'>

  Create a new container for the backend of the todo application.

  You can use graphql or other solutions if you want.

  Use ingress routing to enable access to the backend.

  Create a POST /todos endpoint and a GET /todos endpoint in the new service where we can post a new todo and get all of the todos. You can also move the image logic to the new service if it requires backend logic.

  The todos can be saved into memory, we'll add database later.

  Frontend already has an input field. Connect it into our backend so that inputting data and pressing send will add a new todo into the list.

</exercise>
