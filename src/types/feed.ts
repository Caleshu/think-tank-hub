export type FeedArgument = {
  id: string
  user_id: string
  topic_id: string
  stance: "for" | "against"
  title: string
  content: string
  version: number
  posted: boolean
  pinned: boolean
  changed_minds_count: number
  avg_stars: number
  created_at: string
  topic_name?: string
  username?: string
  my_interaction?: { stars: number | null; mind_changed: boolean } | null
}

export type DebateReply = {
  id: string
  argument_id: string
  parent_id: string | null
  reply_type: "support" | "disagree"
  content: string
  user_id: string
  username: string
  changed_minds_count: number
  avg_stars: number
  created_at: string
  children: DebateReply[]
  my_interaction?: { stars: number | null; mind_changed: boolean } | null
}

/** Find a node anywhere in the tree by id */
export function findNode(id: string, nodes: DebateReply[]): DebateReply | null {
  for (const n of nodes) {
    if (n.id === id) return n
    const found = findNode(id, n.children)
    if (found) return found
  }
  return null
}

/** Return the ordered path from a root in `nodes` down to the node with `id` */
export function getPathToNode(id: string, nodes: DebateReply[], acc: DebateReply[] = []): DebateReply[] {
  for (const n of nodes) {
    const path = [...acc, n]
    if (n.id === id) return path
    const result = getPathToNode(id, n.children, path)
    if (result.length) return result
  }
  return []
}

export function buildTree(flat: Omit<DebateReply, "children">[]): DebateReply[] {
  const map = new Map<string, DebateReply>()
  flat.forEach((r) => map.set(r.id, { ...r, children: [] }))
  const roots: DebateReply[] = []
  flat.forEach((r) => {
    if (r.parent_id) {
      map.get(r.parent_id)?.children.push(map.get(r.id)!)
    } else {
      roots.push(map.get(r.id)!)
    }
  })
  return roots
}
