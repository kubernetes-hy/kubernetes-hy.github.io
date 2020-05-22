---
layout: page
title: Part 4
inheader: yes
permalink: /part4/
order: 4
---


**HERE BE DRAGONS**

## Update strategies ##

In the last part we did automated updates with a deployment pipeline. The update *just worked* but we have no idea how the update actually happened, other than that a pod was changed, and we can make the update process safer to help us reach a higher number of [nines](https://en.wikipedia.org/wiki/High_availability).

There are multiple update/deployment/release strategies. We will focus on two of them and how to implement them.

- Rolling update
- Canary release

Both of these update are designed to make sure that the application works during and after an update. Rather than updating every pod at the same time the idea is to update the pods one at a time and confirm that the application works.

### Rolling update ###

By default Kubernetes initiates a "rolling update" when we change the image. That means that every pod is updated sequentially. The rolling update is a great default since it enables the application to be available during the update. If we decide to push an image that does not work the update will automatically stop.

I've prepared an application with 5 versions here. v1 works always, v2 never works, v3 works 50% of the time, v4 will die after 20 seconds and v5 works always. We'll use kustomize to switch between them.

```yaml
TODO here
```

```console
TODO example
```

But more often the image itself works, it's just that there's a bug which prevents it from working correctly. This is where *ReadinessProbes* come in.

With a *ReadinessProbe* we can check if a pod is ready to process requests.

The application has an endpoint [/healthz](https://stackoverflow.com/questions/43380939/where-does-the-convention-of-using-healthz-for-application-health-checks-come-f)

There are other Probes that you may require in real life but is not discussed further on this course. *LivenessProbes* can be configured similarly, but if the check fails the container will be killed. A *StartupProbe* can delay the liveness probe so that an application with a longer startup can take its time.

### Canary release ###

TODO: I have no idea what will happen here

### Other strategies ###

There are also update strategies that support A/B testing where a group of users (or QA testers) are using a different version. 
