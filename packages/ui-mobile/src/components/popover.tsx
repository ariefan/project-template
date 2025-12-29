import * as PopoverPrimitive from "@rn-primitives/popover";
import { NativeOnlyAnimatedView } from "@workspace/ui-mobile/components/native-only-animated-view";
import { TextClassContext } from "@workspace/ui-mobile/components/text";
import { cn } from "@workspace/ui-mobile/lib/utils";
import * as React from "react";
import { Platform, StyleSheet } from "react-native";
import { FadeIn, FadeOut } from "react-native-reanimated";
import { FullWindowOverlay as RNFullWindowOverlay } from "react-native-screens";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const FullWindowOverlay =
  Platform.OS === "ios" ? RNFullWindowOverlay : React.Fragment;

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  portalHost,
  ...props
}: PopoverPrimitive.ContentProps &
  React.RefAttributes<PopoverPrimitive.ContentRef> & {
    portalHost?: string;
  }) {
  return (
    <PopoverPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <PopoverPrimitive.Overlay
          style={Platform.select({ native: StyleSheet.absoluteFill })}
        >
          <NativeOnlyAnimatedView
            entering={FadeIn.duration(200)}
            exiting={FadeOut}
          >
            <TextClassContext.Provider value="text-popover-foreground">
              <PopoverPrimitive.Content
                align={align}
                className={cn(
                  "z-50 w-72 rounded-md border border-border bg-popover p-4 shadow-black/5 shadow-md outline-hidden",
                  Platform.select({
                    web: cn(
                      "fade-in-0 zoom-in-95 origin-(--radix-popover-content-transform-origin) animate-in cursor-auto",
                      props.side === "bottom" && "slide-in-from-top-2",
                      props.side === "top" && "slide-in-from-bottom-2"
                    ),
                  }),
                  className
                )}
                sideOffset={sideOffset}
                {...props}
              />
            </TextClassContext.Provider>
          </NativeOnlyAnimatedView>
        </PopoverPrimitive.Overlay>
      </FullWindowOverlay>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };
