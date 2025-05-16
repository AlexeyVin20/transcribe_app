"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
  // Обработчики для поддержки событий drag
  const [isDragging, setIsDragging] = React.useState(false)

  // Обработчик начала перетаскивания
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true)
    // Вызываем пользовательский обработчик, если он есть
    if (props.onPointerDown) {
      props.onPointerDown(e)
    }
  }

  // Обработчик завершения перетаскивания
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false)
    // Вызываем пользовательский обработчик, если он есть
    if (props.onPointerUp) {
      props.onPointerUp(e)
    }
  }

  // Обработчик для изменения значения
  const onValueChangeWrapper = (value: number[]) => {
    if (props.onValueChange) {
      props.onValueChange(value)
    }
  }

  // Обработчик для завершения изменения значения
  const onValueCommitWrapper = (value: number[]) => {
    if (props.onValueCommit) {
      props.onValueCommit(value)
    }
    setIsDragging(false)
  }

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      {...props}
      onValueChange={onValueChangeWrapper}
      onValueCommit={onValueCommitWrapper}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:cursor-pointer disabled:opacity-50" />
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider } 