import { renderDamageSourceZone } from "./traitPairChat.mjs";

const SCOPE = "fadingsuns4e";

async function resolveBoundActor(actorUuid) {
  const resolver = globalThis.fromUuid ?? globalThis.foundry?.utils?.fromUuid;
  if (typeof resolver !== "function") return null;
  const actor = await resolver(actorUuid);
  if (
    !actor
    || actor.documentName !== "Actor"
    || actor.uuid !== actorUuid
  ) return null;
  return actor;
}

export async function renderGmDamageZone(message, zone) {
  const gmDamage = message.getFlag?.(SCOPE, "gmDamage");
  if (gmDamage?.status !== "resolved") return;
  zone.replaceChildren();
  if (game.user?.isGM !== true) {
    renderDamageSourceZone(message, zone, null, { allowActions: false });
    return;
  }
  const targetActor = await resolveBoundActor(gmDamage.targetActorUuid);
  if (!targetActor) {
    const notice = document.createElement("p");
    notice.className = "gm-tools-chat-notice";
    notice.textContent = game.i18n.localize(
      "FADING_SUNS.GmTools.Errors.TargetUnavailable"
    );
    zone.append(notice);
    return;
  }
  renderDamageSourceZone(message, zone, targetActor);
}

async function onRenderChatMessageHTML(message, html) {
  const gmDamage = message.getFlag?.(SCOPE, "gmDamage");
  if (gmDamage?.status !== "resolved") return;
  const selector = ".fadingsuns4e.gm-damage-card";
  const card = html.matches?.(selector) ? html : html.querySelector?.(selector);
  const zone = card?.querySelector?.(".gm-damage-resolution");
  if (zone) await renderGmDamageZone(message, zone);
}

export function registerGmToolsChat() {
  Hooks.on("renderChatMessageHTML", onRenderChatMessageHTML);
}
