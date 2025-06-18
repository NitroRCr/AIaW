import { Avatar, IconAvatar } from "../types"

import { defaultTextAvatar } from "./functions"

const defaultAvatar = {
  type: "icon",
  icon: "bug_report",
  hue: Math.floor(Math.random() * 360)
} as IconAvatar

const mapAvatarOrDefault = <T extends {avatar: Avatar}>(obj: T, name?: string): T => {
  return { ...obj, avatar: obj.avatar ?? (name ? defaultTextAvatar(name) : defaultAvatar) }
}

export { mapAvatarOrDefault }
