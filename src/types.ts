import absmartly from "@absmartly/javascript-sdk";

export type ProdOrDevType = "production" | "development";

export type SDKOptionsType = {
  endpoint: string;
  apiKey: string;
  environment: string;
  application: string;
  retries?: number;
  timeout?: number;
  eventLogger?: (
    context: typeof absmartly.Context,
    eventName: EventNameType,
    data: any
  ) => void;
};

export type ABSmartlySDK = typeof absmartly.SDK;

export type EventNameType =
  | "error"
  | "ready"
  | "refresh"
  | "publish"
  | "exposure"
  | "goal"
  | "finalize";

export type TreatmentProps = {
  variant: number;
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
