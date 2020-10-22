import React from "react"
import Helmet from "react-helmet"
import Layout from "../templates/Layout"
import Container from "../components/Container"
import { OutboundLink } from "gatsby-plugin-google-analytics"
import { withLoginStateContext } from "../contexes/LoginStateContext"

const Credits = () => (
  <Layout>
    <Container>
      <Helmet title="Licence" />
      <h1>Thank you and licence</h1>
      <h2>Course material</h2>

      <p>
        Course material has been done by Jami Kousa with the help of University
        of Helsinki's Tietojenkäsittelytieteen osaston sovelluskehitysakatemia
        (Toska) and numerous course attendees.
      </p>
      <p>
        This material is licenced under{" "}
        <OutboundLink
          href="http://creativecommons.org/licenses/by-nc-sa/3.0/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Creative Commons BY-NC-SA 3.0 -licence
        </OutboundLink>{" "}
        so you can freely use and distribute the material, as long as original
        creators are credited. If you make changes to material and you want to
        distribute altered version it must be licenced under the same licence.
        Usage of material for commercial use is prohibited without permission.
      </p>

      <h2>mooc.fi framework</h2>

      <p>
        The material framework, including the quizz system and other
        functionality, have been created by{" "}
        <OutboundLink
          href="https://github.com/nygrenh"
          target="_blank"
          rel="noopener noreferrer"
        >
          Henrik Nygren
        </OutboundLink>{" "}
        and{" "}
        <OutboundLink
          href="https://github.com/redande"
          target="_blank"
          rel="noopener noreferrer"
        >
          Antti Leinonen
        </OutboundLink>
        and{" "}
        <OutboundLink
          href="https://www.helsinki.fi/en/researchgroups/data-driven-education"
          target="_blank"
          rel="noopener noreferrer"
        >
          Agile Education Research Group
        </OutboundLink>{" "}
        of the University of Helsinki.
      </p>
    </Container>
  </Layout>
)

export default withLoginStateContext(Credits)
