const axios = require('axios')
const micro = require('micro')
const Octokat = require('octokat')

function extractIssueNumber(url) {
  let urlParts = url.split('/')
  return parseInt(urlParts[urlParts.length - 1], 10)
}

function expoUrlForCommit(commit) {
  return `https://expo.io/@watchdog-system/watchdog-app?release-channel=${commit.replace(
    '/',
    '_',
  )}`
}

const octo = new Octokat({ token: process.env.API_TOKEN })

const server = micro(async (req, res) => {
  const json = await micro.json(req)
  const commit = json.payload.branch
  const body = json.payload.body
  const committer_name = json.payload.committer_name
  const committer_email = json.payload.committer_email
  const prUrl = json.payload.pull_requests[0].url
  if (json.payload.status === 'success' && prUrl) {
    const issueId = extractIssueNumber(prUrl)
    const expoUrl = expoUrlForCommit(commit)

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${expoUrl}`
    const body = `watchdog-system for ${commit} has been deployed.\n\n![](${qrCodeUrl})\n${expoUrl}`

    await octo
      .repos('xcarpentier', 'watchdog-system')
      .issues(issueId)
      .comments.create({ body })

    await axios({
      method: 'POST',
      url:
        'https://hooks.slack.com/services/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',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: `payload=${encodeURIComponent(
        JSON.stringify({
          text: `*Watchdog-System* APP for *${commit}* has been *deployed*! 🎉`,
          channel: 'watchdog-ext',
          username: 'bot',
          icon_emoji: ':iphone:',
          attachments: [
            {
              color: '#36a640',
              title: `Link to the new ${commit} app version`,
              title_link: expoUrl,
              image_url: qrCodeUrl,
              ts: new Date().getTime() / 1000,
            },
            {
              color: '#FECC33',
              title: body,
              author_name: `${committer_name} <${committer_email}>`,
            },
          ],
        }),
      )}`,
    })
  }

  return 'ok'
})

server.listen(3000)
