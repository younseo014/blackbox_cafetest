import { useLayoutEffect, useRef } from "react";

const ROW_HEIGHT = 52;
const MIN_SCORE = 0;
const MAX_SCORE = 10;

type ScoreWheelProps = {
  id: string;
  label: string;
  hint: string;
  value: number;
  onChange: (score: number) => void;
  disabled?: boolean;
};

function clampScore(value: number) {
  return Math.min(MAX_SCORE, Math.max(MIN_SCORE, value));
}

export function ScoreWheel({ id, label, hint, value, onChange, disabled = false }: ScoreWheelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startY: number; startScrollTop: number; moved: boolean } | null>(null);
  const lastDragEndedAtRef = useRef(-Infinity);

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const target = value * ROW_HEIGHT;
    if (Math.abs(scroller.scrollTop - target) > ROW_HEIGHT / 2) {
      scroller.scrollTo({ top: target, behavior: "instant" });
    }
  }, [value]);

  function updateFromScroll() {
    const scroller = scrollRef.current;
    if (!scroller || disabled) return;
    const next = clampScore(Math.round(scroller.scrollTop / ROW_HEIGHT));
    if (next !== value) onChange(next);
  }

  function changeScore(score: number) {
    if (disabled) return;
    const next = clampScore(score);
    onChange(next);
    scrollRef.current?.scrollTo({ top: next * ROW_HEIGHT, behavior: "instant" });
  }

  function finishDrag(pointerId: number) {
    const scroller = scrollRef.current;
    const drag = dragRef.current;
    if (!scroller || !drag || drag.pointerId !== pointerId) return;
    dragRef.current = null;
    scroller.style.scrollSnapType = "";
    if (scroller.hasPointerCapture(pointerId)) scroller.releasePointerCapture(pointerId);
    if (drag.moved) {
      lastDragEndedAtRef.current = performance.now();
      changeScore(Math.round(scroller.scrollTop / ROW_HEIGHT));
    }
  }

  return (
    <div className="score-wheel-field">
      <div className="score-wheel-heading">
        <strong id={`${id}-label`}>{label}</strong>
        <span>{hint}</span>
      </div>
      <button className="score-wheel-arrow" type="button" aria-label={`${label} 1점 낮추기`} onClick={() => changeScore(value - 1)} disabled={disabled || value === MIN_SCORE}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 14 6-6 6 6" /></svg>
      </button>
      <div className="score-wheel-frame">
        <span className="score-wheel-focus" aria-hidden="true" />
        <div
          id={id}
          ref={scrollRef}
          className="score-wheel-scroll"
          role="spinbutton"
          aria-labelledby={`${id}-label`}
          aria-valuemin={MIN_SCORE}
          aria-valuemax={MAX_SCORE}
          aria-valuenow={value}
          aria-valuetext={`${value}점`}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : 0}
          onScroll={updateFromScroll}
          onPointerDown={(event) => {
            if (disabled || event.pointerType === "touch") return;
            const scroller = event.currentTarget;
            dragRef.current = { pointerId: event.pointerId, startY: event.clientY, startScrollTop: scroller.scrollTop, moved: false };
            scroller.style.scrollSnapType = "none";
            scroller.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            if (Math.abs(event.clientY - drag.startY) > 4) drag.moved = true;
            if (drag.moved) event.currentTarget.scrollTop = drag.startScrollTop + drag.startY - event.clientY;
          }}
          onPointerUp={(event) => finishDrag(event.pointerId)}
          onPointerCancel={(event) => finishDrag(event.pointerId)}
          onClickCapture={(event) => {
            if (performance.now() - lastDragEndedAtRef.current < 250) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
          onKeyDown={(event) => {
            if (disabled) return;
            let next: number | null = null;
            if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = value - 1;
            if (event.key === "ArrowDown" || event.key === "ArrowRight") next = value + 1;
            if (event.key === "Home") next = MIN_SCORE;
            if (event.key === "End") next = MAX_SCORE;
            if (next !== null) {
              event.preventDefault();
              changeScore(next);
            }
          }}
        >
          {Array.from({ length: MAX_SCORE + 1 }, (_, score) => (
            <div
              key={score}
              className={`score-wheel-item${score === value ? " selected" : ""}`}
              aria-hidden="true"
              onClick={() => changeScore(score)}
            >
              <span>{score}</span><small>점</small>
            </div>
          ))}
        </div>
      </div>
      <button className="score-wheel-arrow" type="button" aria-label={`${label} 1점 높이기`} onClick={() => changeScore(value + 1)} disabled={disabled || value === MAX_SCORE}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 10 6 6 6-6" /></svg>
      </button>
      <span className="score-wheel-guide">스크롤하거나 드래그해 조절</span>
    </div>
  );
}
