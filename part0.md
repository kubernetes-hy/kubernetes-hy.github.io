---
layout: page
title: part 0
inheader: yes
permalink: /part0/
order: 0
---

## General

This course is an introductory course to Kubernetes. The course will also look into what different parts web services consist of, such as reverse proxies, databases etc. Docker can not be installed on faculty computers so students will need to provide their own computers to follow the examples outlined in this course material and to complete the exercises.

### Prerequisites

Attendees need to provide their own computers with admin/superuser priviledges. Attendees are also expected to have completed DevOps with Docker or have experience with Docker and docker-compose.

### Course material

The course material is meant to be read part by part from start to finish. To get a passing grade you have to do every exercise. There are exercises in the material placed so that you will have learned needed skills in the material before it. You can do the exercises as you go through the material.

The course material is written for Mac, so some instructions may lack platform specific details. Please make a pull request to the course material in case you find any mistakes or wish to add something. You can also add an "issue" through github in case you find any issues with the course material.

### Completing course

### Grading

This course size is 5 ECTS credits. The details for optional completion methods are not available yet.

## Getting started

#### Starting lecture

Starting lecture is not mandatory. It will be held ????

#### Telegram

This course has a Telegram group where we discuss everything about the course. Support is available almost 24/7, with discussion being in both English and Finnish.

Join our DevOps with Docker telegram group [here](https://t.me/joinchat/HIg2vhI6xgyrWhVvJ7eiiA).

**All** inappropriate, degrading or discriminating comments on the channel are prohibited and will lead to action taken against the commenter.

## Installing Docker

Use the official documentation to find download instructions for docker-ce for the platform of your choice:

[Ubuntu](https://docs.docker.com/install/linux/docker-ce/ubuntu/)

[MacOS](https://docs.docker.com/docker-for-mac/install/)

[Windows](https://docs.docker.com/docker-for-windows/install/)

Confirm that Docker installed correctly by opening a terminal and running `docker -v` to see the installed version.

## Installing docker-compose

During the writing of these materials, both MacOS and Windows have docker-compose included in their respective Docker packages.

Use the official documentation to find download instructions for docker-compose for the platform of your choice:

[Install instructions](https://docs.docker.com/compose/install/)

Confirm that docker-compose installed correctly by opening a terminal and running `docker-compose -v` to see the installed docker-compose version.

> TIP: To avoid writing sudos you may consider [adding yourself to docker group](https://docs.docker.com/install/linux/linux-postinstall/)

## Installing kubectl

[Install instructions](https://kubernetes.io/docs/tasks/tools/install-kubectl/)

## Installing k3d

[Install instructions](https://github.com/rancher/k3d)

### Mistakes:

If you find anything missing, issues, typos or mistakes with the material. You can add an [issue](https://github.com/kubernetes-hy/kubernetes-hy.github.io/issues) and if you want to commit to the project you can do so by creating a [pull request](https://github.com/kubernetes-hy/kubernetes-hy.github.io/pulls) with your proposed fixes.
