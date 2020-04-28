---
layout: page
title: Part 3
inheader: yes
permalink: /part3/
order: 3
---

## Google Kubernetes Engine ##

We have used Kubernetes distribution k3s using docker containers via k3d. In a production environment the task of maintaining a Kubernetes cluster is often left to third parties. A managed Kubernetes as a service is often the best choice as the additional work required in maintenance exceeds the benefits of a personal cluster. In some, somewhat rare, cases setting up and maintaining your own cluster is a reasonable option. A case for it would be that your company/organization already has the hardware and/or wants to stay independent from providers, one such example could be a University. 

Even in Kubernetes then the cost for running a software that is rarely used may be higher than the value it generates. In such cases using [Serverless](https://en.wikipedia.org/wiki/Serverless_computing) solutions could be more cost efficient. Kubernetes can get really expensive really fast.

Let's focus on the Google Kubernetes Engine (GKE) costs for now. Note that the GKE costs a little bit more than its competitors.

The calculator here [https://cloud.google.com/products/calculator](https://cloud.google.com/products/calculator) offers us a picture of the pricing. I decided to try a cheap option: 6 nodes in 1 zonal cluster using 1 vCPU each. Datacenter location is in Finland and I don't need persistent disk. If we wanted less than 6 nodes why would we even use Kubernetes. The total cost for this example was 145€ - $160 per month. Adding additional services such as a Load balancer increase the cost.

During the part 3 we will be using GKE either by using the student credits or the free credits offered by google. You are responsible for making sure that the credits last for the whole part and if all of them are consumed I can not help you.

After redeeming the credits we can create a project with the billing account. The google cloud UI can be confusing. On the [resources page](https://console.cloud.google.com/cloud-resource-manager) we can create a new project and let's name it "dwk-gke" for the purposes of this course. After creating this project make sure that the project is linked to the correct billing account from the top left dropdown and billing and then "Account Management". It should look like this (account is "DevOps with Kubernetes" and project "dwk-gke"):

![]({{ "/images/part3/gke_billing.png" | absolute_url }})

Install the Google Cloud SDK. Instructions [here](https://cloud.google.com/sdk/install). After that login and set the previously created project to be used.

```console
$ gcloud -v
  Google Cloud SDK 290.0.1
  bq 2.0.56
  core 2020.04.24
  gsutil 4.49

$ gcloud auth login
  ...
  You are now logged in

$ gcloud config set project dwk-gke
  Updated property [core/project].
```



## Volumes Part 2 ##

## Deployment Pipeline ##

## Summary ##