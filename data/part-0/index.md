---
path: '/part-0'
title: 'Part 0'
overview: true
hidden: false
---

### Prerequisites ###

Attendees are expected to have completed [DevOps with Docker](https://devopswithdocker.com) or have Docker and docker compose experience. In addition, experience with web development is required, such as [Full Stack Web Development](https://fullstackopen.com/en/) or equivalent. Attendees need admin/superuser privileges to complete the exercises and the examples of the material on their computers.

### Course material ###

The course material is meant to be read part by part from start to finish. The material contains exercises, which are placed so that the preceding material provides enough information for solving each exercise. Do the exercises as you go through the material. As you progress further, you will be increasingly searching for information on the internet. You should also supplement your knowledge with the [official documentation](https://kubernetes.io/docs/home/)!

The course material is written using Mac, so some instructions may lack platform-specific details. Please make a pull request to the course material in case you find any mistakes or wish to add something. You can also add an issue through GitHub if you find any problems with the course material.

## Completion and grading ##

To complete the course, complete exercises in parts 1-5. To get lowest passing grade, 27 exercises is required.

The total workload of the course is about 100 hours depending on your background.

Course size is 5 ECTS credits. The course has a total of 48 exercises, grade will depend on the number of submitted exercises:

| grade | exercises |
|----------|----------|
| 5    |  47 |
| 4    |  42 |
| 3    |  37 |
| 2    |  32 |
| 1    |  27 |

### Exercises ###

Make a repository on GitHub and publish your solutions in clearly ordered files/folders. If you need help using Git, you should refer to their [guide](https://guides.github.com/activities/hello-world/). Make sure that the repository is available to me. We prefer public repositories, but if you want to keep your experience secret, you can create a private repository and add [Jakousa](https://github.com/Jakousa) as a collaborator.

Most of the exercises will require you to write code or publish something to Docker Hub. If you are unsure what to submit, you can ask for help in the course chat.

A system for detecting plagiarism is used to check exercises submitted to GitHub. If multiple students hand in the same code, the issue is handled according to the [policy on plagiarism](https://studies.helsinki.fi/instructions/article/what-cheating-and-plagiarism) of the University of Helsinki.

There are multiple exercises in each part. After you have completed **all** of the exercises for a part, use the [submission system](https://studies.cs.helsinki.fi/stats/courses/kubernetes2024). Note that you can **not** edit a submission, so mark all as completed.

## Google Cloud Credits ##

In part 3, we will use Google Kubernetes Engine. It is not free, but everyone starting with Google Cloud has $300 worth of free credits. See your options [here](https://cloud.google.com/free).

Google has offered students with @helsinki.fi email addresses some Google Cloud Credits. Finnish/Open University students, you will be given a @helsinki.fi address when you register for the Open University course. Note that registration is only possible when the course starts officially!

If you have used all $300 Google Cloud credits, there is nothing we can do. You can complete parts 1-2 and most likely 4-5, but part 3 is required to complete the course with higher grades.

You may also very well use another cloud provider but we do not have any instructions on how to get up and running on other providers.

## Getting started ##

### Discord ###

This course has a Discord group where we discuss everything about the course. Support is available almost 24/7, with the discussion being in both English and Finnish.

Join our DevOps with Kubernetes Discord channel: <https://study.cs.helsinki.fi/discord/join/kubernetes>.

**All** inappropriate, degrading, or discriminating comments on the channel are prohibited and will lead to action taken against the commenter.

### Installing kubectl ###

Kubectl is a command-line tool that we will use to communicate with our Kubernetes cluster. [Install instructions](https://kubernetes.io/docs/tasks/tools/install-kubectl/)

### Installing k3d ###

We will also use k3d for practice. The [Install instructions](https://github.com/rancher/k3d#get) are here. I have tested the course material with version 5.4.1 of k3d.

#### Note about k3d permission errors ####

You might get a `Permission denied` error while using `k3d` as a normal user.

Be sure to go through this [docker post-installation step](https://docs.docker.com/engine/install/linux-postinstall/#manage-docker-as-a-non-root-user)

Running `k3d` as `sudo` leads to problems such as generating the kubeconfig into wrong place i.e. not into _~/.kube_.

## Mistakes ##

Did you find a mistake, issue, typo, or something missing? Maybe you just thought that something was not well written and you could do better? Is it Hacktoberfest? Or maybe you want to share a link to a great blog post? Please go ahead and contribute!

Since the course is open source, you can fork, edit and send a pull request. If you do not know what forking is or how to make a pull request consult the [GitHub guides](https://guides.github.com/activities/hello-world/). It is okay to practice here.

If you feel like you do not want to be part of the list of [contributors](https://github.com/kubernetes-hy/kubernetes-hy.github.io/graphs/contributors) you can also add an issue. The guide for making an issue in GitHub is [here](https://help.github.com/en/articles/creating-an-issue).

Here is a link to the repository to find the tabs for issues and pull requests: [https://github.com/kubernetes-hy/kubernetes-hy.github.io](https://github.com/kubernetes-hy/kubernetes-hy.github.io)

