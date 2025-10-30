"use client"

import * as React from "react"

type ScrollAreaProps = React.ComponentPropsWithoutRef<"div">

export const Root = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ style, ...props }, ref) => (
    <div
      ref={ref}
      style={{
        position: "relative",
        overflow: "auto",
        ...style,
      }}
      {...props}
    />
  ),
)
Root.displayName = "ScrollAreaRoot"

export const Viewport = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ style, ...props }, ref) => (
    <div
      ref={ref}
      style={{ width: "100%", height: "100%", ...style }}
      {...props}
    />
  ),
)
Viewport.displayName = "ScrollAreaViewport"

type ScrollbarProps = React.ComponentPropsWithoutRef<"div"> & {
  orientation?: "horizontal" | "vertical"
}

export const ScrollAreaScrollbar = React.forwardRef<HTMLDivElement, ScrollbarProps>(
  ({ orientation = "vertical", style, ...props }, ref) => (
    <div
      ref={ref}
      data-orientation={orientation}
      style={{
        position: "absolute",
        right: orientation === "vertical" ? 0 : undefined,
        bottom: orientation === "horizontal" ? 0 : undefined,
        left: orientation === "horizontal" ? 0 : undefined,
        top: orientation === "vertical" ? 0 : undefined,
        display: "none",
        ...style,
      }}
      {...props}
    />
  ),
)
ScrollAreaScrollbar.displayName = "ScrollAreaScrollbar"

export const ScrollAreaThumb = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ style, ...props }, ref) => (
    <div ref={ref} style={{ flex: 1, ...style }} {...props} />
  ),
)
ScrollAreaThumb.displayName = "ScrollAreaThumb"

export const Corner = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ style, ...props }, ref) => <div ref={ref} style={{ ...style }} {...props} />,
)
Corner.displayName = "ScrollAreaCorner"

