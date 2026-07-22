import type { PcbSmtPad, PcbVia } from "circuit-json"

const distanceToSegment = (
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
) => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  const t =
    lengthSquared <= 1e-12
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((point.x - start.x) * dx + (point.y - start.y) * dy) /
              lengthSquared,
          ),
        )
  return Math.hypot(
    point.x - (start.x + dx * t),
    point.y - (start.y + dy * t),
  )
}

const pointInPolygon = (
  point: { x: number; y: number },
  polygon: Array<{ x: number; y: number }>,
) => {
  let inside = false
  for (
    let index = 0, prior = polygon.length - 1;
    index < polygon.length;
    prior = index++
  ) {
    const currentPoint = polygon[index]!
    const priorPoint = polygon[prior]!
    if (
      currentPoint.y > point.y !== priorPoint.y > point.y &&
      point.x <
        ((priorPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (priorPoint.y - currentPoint.y) +
          currentPoint.x
    ) {
      inside = !inside
    }
  }
  return inside
}

export const routedViaOverlapsPad = (via: PcbVia, pad: PcbSmtPad) => {
  if (!via.layers.includes(pad.layer)) return false
  const viaRadius = via.outer_diameter / 2
  if (pad.shape === "polygon") {
    if (pointInPolygon({ x: via.x, y: via.y }, pad.points)) return true
    return pad.points.some(
      (start, index) =>
        distanceToSegment(
          { x: via.x, y: via.y },
          start,
          pad.points[(index + 1) % pad.points.length]!,
        ) < viaRadius,
    )
  }

  const rotation =
    pad.shape === "rotated_rect" || pad.shape === "rotated_pill"
      ? (-pad.ccw_rotation * Math.PI) / 180
      : 0
  const translated = { x: via.x - pad.x, y: via.y - pad.y }
  const localPoint = {
    x:
      translated.x * Math.cos(rotation) -
      translated.y * Math.sin(rotation),
    y:
      translated.x * Math.sin(rotation) +
      translated.y * Math.cos(rotation),
  }

  if (pad.shape === "circle") {
    return Math.hypot(localPoint.x, localPoint.y) < pad.radius + viaRadius
  }
  if (pad.shape === "pill" || pad.shape === "rotated_pill") {
    const horizontal = pad.width >= pad.height
    const radius = Math.min(pad.width, pad.height) / 2
    const halfSegment = Math.abs(pad.width - pad.height) / 2
    return (
      distanceToSegment(
        localPoint,
        horizontal
          ? { x: -halfSegment, y: 0 }
          : { x: 0, y: -halfSegment },
        horizontal
          ? { x: halfSegment, y: 0 }
          : { x: 0, y: halfSegment },
      ) <
      radius + viaRadius
    )
  }
  const dx = Math.max(Math.abs(localPoint.x) - pad.width / 2, 0)
  const dy = Math.max(Math.abs(localPoint.y) - pad.height / 2, 0)
  return Math.hypot(dx, dy) < viaRadius
}
