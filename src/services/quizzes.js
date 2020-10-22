import axios from "axios"
import { accessToken, getCourseVariant, loggedIn } from "./moocfi"
import CourseSettings from "../../course-settings"

// const id = CourseSettings.quizzesId
const language = CourseSettings.language

const quizzesLanguage = language === "en" ? "en_US" : "fi_FI"

export async function fetchQuizzesProgress() {
  let id = CourseSettings.quizzesId
  const courseVariant = await getCourseVariant()

  if (courseVariant === "ohja-dl" || courseVariant === "ohja-nodl") {
    id = "5c89b9b6-b8a6-4079-8c4f-a4bbc80b66a4"
  }
  const response = await axios.get(
    `https://quizzes.mooc.fi/api/v1/courses/${id}/users/current/progress`,
    { headers: { Authorization: `Bearer ${accessToken()}` } },
  )
  return response.data?.points_by_group
}

export async function fetchQuizNames() {
  let id = CourseSettings.quizzesId
  let courseVariant = "dl"

  if (loggedIn()) {
    courseVariant = await getCourseVariant()
  }

  if (courseVariant === "ohja-dl" || courseVariant === "ohja-nodl") {
    id = "5c89b9b6-b8a6-4079-8c4f-a4bbc80b66a4"
  }

  const response = await axios.get(
    `https://quizzes.mooc.fi/api/v1/quizzes/${id}/titles/${quizzesLanguage}`,
  )
  return response.data
}
