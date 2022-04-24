---
path: '/part-0'
title: 'Part 0'
overview: true
hidden: false
---

### Prerequisites ###

Attendees are expected to have completed [DevOps with Docker](https://devopswithdocker.com) or have Docker and docker-compose experience.
In addition, experience with web software is required, such as [Full Stack Web Development](https://fullstackopen.com/en/) or equivalent.
Attendees need admin/superuser privileges to complete the exercises and the examples of the material on their computers.

### Course material ###

The course material is meant to be read part by part from start to finish. To get a passing grade, you have to do every exercise. There are exercises in the material placed so that you have learned the required skills from the material. Do the exercises as you go through the material. As you progress further, you will be increasingly searching for information on the internet. You should also supplement your knowledge with the official documentation!

The course material is written using Mac, so some instructions may lack platform-specific details. Please make a pull request to the course material in case you find any mistakes or wish to add something. You can also add an issue through GitHub if you find any problems with the course material. Pinging @Jami Kousa in the Discord also works in some quick-fix cases.

## Completing course ##

To complete the course, submit solutions for all of the exercises in parts 1-5. There is no exam.

The total workload of the course is about 95 hours. You can find out how long it took others by peeking at the [statistics](https://studies.cs.helsinki.fi/stats/courses/kubernetes2020).

### Exercises ###

Complete all of the exercises to receive a passing grade.

Make a repository to GitHub and publish your solutions in clearly ordered files / folders. If you need help publishing using Git, you should refer to their [guide](https://guides.github.com/activities/hello-world/). Make sure that the repository is available to me. We prefer public repositories, but if you want to keep your experience secret, you can create a private repository and add [Jakousa](https://github.com/Jakousa) as a collaborator.

Most of the exercises will require you to write code or publish something to Docker Hub. If you are unsure what to submit, you can ask for help in the course chat.

A system for detecting plagiarism is used to check exercises submitted to GitHub. If multiple students hand in the same code, the situation is handled according to the [policy on plagiarism](https://studies.helsinki.fi/instructions/article/what-cheating-and-plagiarism) of the University of Helsinki.

There are multiple exercises in each part. After you have completed all of the exercises for a part, use the [submission application](https://studies.cs.helsinki.fi/stats/courses/kubernetes2020). Note that you can **not** edit a submission, so mark all as completed.

### Grading ###

Course size is 5 ECTS credits. Pass/Fail.

### Quizzes ###

The material includes Quizzes that look like this:

<quiz id="467fa274-1e29-4a46-b7ea-c9238fe1612c"></quiz>

They are an optional part of the course and do not affect your grading. To participate in the quizzes, you have to register a "TMC" account. You can find controls to create an account at the top of the page. Quizzes work as an easy way for us to gather feedback and improve the course.

## Google Cloud Credits ##

In part 3, we will use Google Kubernetes Engine. It is not free, but everyone starting with Google Cloud has $300 worth of free credits. See your options [here](https://cloud.google.com/free).

Google has offered students with @helsinki.fi email addresses some Google Cloud Credits. Finnish/Open University students, you will be given a @helsinki.fi address when you register to the Open University course.

If you have used all $300 Google Cloud credits, there is nothing I can do. You can complete parts 1-2 and most likely 4-5, but part 3 is required for course completion and the certificate.

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

Since the course is open source, you can fork, edit and send a pull request. If you do not know what forking is or how to make a pull request consult the [github guides](https://guides.github.com/activities/hello-world/). It is okay to practice here.

If you feel like you do not want to be part of the list of [contributors](https://github.com/kubernetes-hy/kubernetes-hy.github.io/graphs/contributors) you can also add an issue. The guide for making an issue in Github is [here](https://help.github.com/en/articles/creating-an-issue).

Here is a link to the repository to find the tabs for issues and pull requests: [https://github.com/kubernetes-hy/kubernetes-hy.github.io](https://github.com/kubernetes-hy/kubernetes-hy.github.io)

## Experience quizz ##

Thank you for answering.

<quiz id="b728269b-89d0-4a37-a163-fd882c3059ba" /></quiz>

<quiz id="455d9346-9b79-4a01-8bf8-aca584c383b6" /></quiz>
