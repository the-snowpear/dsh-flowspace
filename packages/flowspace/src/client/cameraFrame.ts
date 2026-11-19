const effects = new WeakMap<Element, { animation: Animation; effect: KeyframeEffect }>();

export function paintLayer(element: Element, properties: Keyframe) {
  const cached = effects.get(element);
  if (cached) {
    cached.effect.setKeyframes([properties]);
    return;
  }
  const effect = new KeyframeEffect(element, [properties], { duration: 1, fill: "both" });
  const animation = new Animation(effect, document.timeline);
  animation.currentTime = 1;
  effects.set(element, { animation, effect });
}

export function settleLayer(element: Element) {
  effects.get(element)?.animation.cancel();
  effects.delete(element);
}
