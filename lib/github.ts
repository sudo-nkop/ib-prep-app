export async function createContentRequest(params: {
  subject: string
  type: string
  description: string
  email?: string
}): Promise<{ success: boolean; issueUrl?: string; error?: string }> {
  const token = process.env.GITHUB_TOKEN

  const title = `[REQUEST] ${params.subject} - ${params.type}`
  const body = `## Content Request

**Subject:** ${params.subject}
**Request Type:** ${params.type}
**Submitted:** ${new Date().toISOString()}
${params.email ? `**Contact:** ${params.email}` : ""}

---

### Description

${params.description}

---

*This issue was automatically created via the IB Prep content request form.*`

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  try {
    const res = await fetch(
      "https://api.github.com/repos/sudo-nkop/ib-prep-app/issues",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          title,
          body,
          labels: ["content-request"],
        }),
      }
    )

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return {
          success: false,
          error:
            "GitHub authentication failed. Please set the GITHUB_TOKEN environment variable with a valid personal access token.",
        }
      }
      if (res.status === 404) {
        return {
          success: false,
          error:
            "Repository not found. Please ensure the repository sudo-nkop/ib-prep-app exists and is accessible.",
        }
      }
      const errText = await res.text()
      return { success: false, error: `GitHub API error ${res.status}: ${errText}` }
    }

    const data = (await res.json()) as { html_url: string }
    return { success: true, issueUrl: data.html_url }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown network error"
    return { success: false, error: `Network error: ${message}` }
  }
}
