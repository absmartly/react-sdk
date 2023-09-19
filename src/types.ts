import absmartly from "@absmartly/javascript-sdk";

export type ABSmartlyContext = InstanceType<typeof absmartly.Context>;

export type ABSmartlySDK = InstanceType<typeof absmartly.SDK>;

export type ABSmartly = {
  sdk: ABSmartlySDK;
  context: ABSmartlyContext;
  resetContext: (
    contextRequest: ContextRequestType,
    contextOptions?: ContextOptionsType
  ) => void;
};

export type ContextRequestType = { units: Record<string, unknown> };

export type ContextOptionsType = {
  publishDelay?: number;
  refreshPeriod?: number;
};

export type TreatmentProps = {
  variant: number | undefined;
  variables: Record<string, any>;
};

export type Char =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z"
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "U"
  | "V"
  | "W"
  | "X"
  | "Y"
  | "Z"
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9";
