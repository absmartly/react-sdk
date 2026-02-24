# ABsmartly React SDK [![npm version](https://badge.fury.io/js/%40absmartly%2Freact-sdk.svg)](https://badge.fury.io/js/%40absmartly%2Freact-sdk)

A/B Smartly - React SDK. This package provides React-specific hooks, components, and providers for the [A/B Smartly](https://www.absmartly.com/) A/B testing platform, built on top of the [A/B Smartly JavaScript SDK](https://www.github.com/absmartly/javascript-sdk).

## Compatibility

The A/B Smartly React SDK is compatible with:

- **React**: 16.8+ (requires hooks support)
- **Rendering**: Client-side and server-side rendering (SSR)

**Browser Support:**
- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE 11+ (requires Promise polyfill)

**Note**: IE 10-11 do not natively support Promises. Include a polyfill like [es6-promise](https://www.npmjs.com/package/es6-promise) or [rsvp](https://www.npmjs.com/package/rsvp).

### Security Warning

**IMPORTANT:** The API key is exposed in your client-side bundle and can be viewed by anyone inspecting network traffic or JavaScript source.

**Best Practices:**
- Only use **publishable/public keys** with **read-only permissions** in browser applications
- **NEVER** use secret keys with write permissions in client-side code
- For write operations or sensitive API calls, implement a **server-side proxy**:
  ```
  Browser --> Your Backend (with secret key) --> ABSmartly API
  ```

## Installation

```shell
npm install @absmartly/react-sdk --save
```

## Getting Started

### Recommended: Using SDKProvider

Wrap your application with the `SDKProvider` component to make the SDK available throughout your React component tree.

```jsx
import React from "react";
import ReactDOM from "react-dom";
import SDKProvider from "@absmartly/react-sdk";
import App from "./App";

const sdkOptions = {
  endpoint: "https://your-company.absmartly.io/v1",
  apiKey: process.env.REACT_APP_ABSMARTLY_API_KEY,
  environment: process.env.NODE_ENV,
  application: "website",
};

const contextOptions = {
  units: {
    session_id: "5ebf06d8cb5d8137290c4abb64155584fbdb64d8",
  },
};

ReactDOM.render(
  <SDKProvider sdkOptions={sdkOptions} contextOptions={contextOptions}>
    <App />
  </SDKProvider>,
  document.getElementById("root")
);
```

### Alternative: Using a Pre-initialized Context

For SSR or when you need more control, you can create the context beforehand and pass it to the provider.

```jsx
import React from "react";
import SDKProvider, { SDK } from "@absmartly/react-sdk";
import App from "./App";

const sdk = new SDK({
  endpoint: "https://your-company.absmartly.io/v1",
  apiKey: process.env.REACT_APP_ABSMARTLY_API_KEY,
  environment: process.env.NODE_ENV,
  application: "website",
});

const context = sdk.createContext({
  units: {
    session_id: "5ebf06d8cb5d8137290c4abb64155584fbdb64d8",
  },
});

function AppWrapper() {
  return (
    <SDKProvider context={context}>
      <App />
    </SDKProvider>
  );
}
```

**SDK Options**

| Config       | Type                                 | Required? | Default | Description                                                                                                                                                                 |
| :----------- | :----------------------------------- | :-------: | :-----: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| endpoint     | `string`                             |  &#9989;  | `null`  | The URL to your API endpoint. Most commonly `"your-company.absmartly.io"`                                                                                                   |
| apiKey       | `string`                             |  &#9989;  | `null`  | Your API key which can be found on the Web Console.                                                                                                                         |
| environment  | `string`                             |  &#9989;  | `null`  | The environment of the platform where the SDK is installed. Environments are created on the Web Console and should match the available environments in your infrastructure. |
| application  | `string`                             |  &#9989;  | `null`  | The name of the application where the SDK is installed. Applications are created on the Web Console and should match the applications where your experiments will be running.|
| retries      | `number`                             | &#10060;  | `5`     | Number of retry attempts for failed HTTP requests.                                                                                                                          |
| timeout      | `number`                             | &#10060;  | `3000`  | Connection timeout in milliseconds.                                                                                                                                         |
| eventLogger  | `(context, eventName, data) => void` | &#10060;  | `null`  | Callback to handle SDK events (ready, exposure, goal, etc.)                                                                                                                 |

**Context Options**

| Config          | Type     | Required? | Default | Description                                                     |
| :-------------- | :------- | :-------: | :-----: | :-------------------------------------------------------------- |
| units           | `object` |  &#9989;  | `{}`    | Map of unit types to unit identifiers (e.g., `{session_id: "..."}`) |
| publishDelay    | `number` | &#10060;  | `100`   | Delay in milliseconds before publishing events.                |
| refreshPeriod   | `number` | &#10060;  | `0`     | Interval in milliseconds to refresh experiment data.           |

## Creating a New Context

### With SDKProvider (Automatic)

When using `SDKProvider` with `sdkOptions` and `contextOptions`, the context is created and managed automatically. The context becomes available to all child components through hooks.

```jsx
<SDKProvider sdkOptions={sdkOptions} contextOptions={contextOptions}>
  <App />
</SDKProvider>
```

### With Pre-fetched Data

When doing full-stack experimentation with A/B Smartly, we recommend creating a context only once on the server-side. Creating a context involves a round-trip to the A/B Smartly event collector. You can avoid repeating the round-trip on the client-side by passing the server-side data directly.

```jsx
const sdk = new SDK({
  endpoint: "https://your-company.absmartly.io/v1",
  apiKey: process.env.REACT_APP_ABSMARTLY_API_KEY,
  environment: process.env.NODE_ENV,
  application: "website",
});

const context = sdk.createContextWith(
  { units: { session_id: sessionId } },
  serverSideContextData
);

function App() {
  return (
    <SDKProvider context={context}>
      <MyComponent />
    </SDKProvider>
  );
}
```

### Refreshing the Context with Fresh Experiment Data

For long-running single-page applications (SPA), the context is usually created once when the application is first reached. However, any experiments being tracked in your production code, but started after the context was created, will not be triggered. To mitigate this, use the `refreshPeriod` option.

```jsx
const contextOptions = {
  units: {
    session_id: "5ebf06d8cb5d8137290c4abb64155584fbdb64d8",
  },
  refreshPeriod: 5 * 60 * 1000, // 5 minutes
};
```

Alternatively, the `refresh()` method can be called manually:

```jsx
function RefreshButton() {
  const { context } = useABSmartly();

  const handleRefresh = async () => {
    try {
      await context.refresh();
      console.log("Context refreshed with latest experiment data");
    } catch (error) {
      console.error("Failed to refresh context:", error);
    }
  };

  return <button onClick={handleRefresh}>Refresh Experiments</button>;
}
```

### Setting Extra Units

You can add additional units to a context by calling the `unit()` or `units()` method. This is useful when a user logs in to your application and you want to add the new unit type to the context.

> **Note:** You cannot override an already set unit type as that would be a change of identity. In this case, use the `resetContext` method to create a new context.

The `unit()` and `units()` methods can be called before the context is ready.

```jsx
function UserProfile() {
  const { context } = useABSmartly();

  const handleLogin = (userId) => {
    context.unit("user_id", userId);

    // or multiple units
    context.units({
      user_id: userId,
      db_user_id: "1000013",
    });
  };

  return <button onClick={() => handleLogin("user123")}>Login</button>;
}
```

## Basic Usage

### Using the useTreatment Hook

The `useTreatment` hook is the primary way to access experiment treatments in functional components.

```jsx
import React from "react";
import { useTreatment } from "@absmartly/react-sdk";

function MyButton() {
  const { variant, loading, error } = useTreatment("exp_button_color");

  if (loading) return <button>Loading...</button>;
  if (error) return <button>Error</button>;

  return (
    <button style={{ backgroundColor: variant === 0 ? "red" : "blue" }}>
      Click Me
    </button>
  );
}
```

### Using the Treatment Component

For declarative treatment rendering, use the `Treatment` component with `TreatmentVariant` children. Variants can be specified as numbers or letters (`"A"`, `"B"`, `"C"`).

```jsx
import React from "react";
import { Treatment, TreatmentVariant } from "@absmartly/react-sdk";

function MyFeature() {
  return (
    <Treatment name="exp_new_feature">
      <TreatmentVariant variant={0}>
        <div>Control - Old Feature</div>
      </TreatmentVariant>
      <TreatmentVariant variant={1}>
        <div>Treatment - New Feature</div>
      </TreatmentVariant>
    </Treatment>
  );
}
```

You can provide a loading component to show while the context is being fetched:

```jsx
<Treatment name="exp_new_feature" loadingComponent={<div>Loading...</div>}>
  <TreatmentVariant variant={0}>
    <div>Control</div>
  </TreatmentVariant>
  <TreatmentVariant variant={1}>
    <div>Treatment</div>
  </TreatmentVariant>
</Treatment>
```

### Using the TreatmentFunction Component

The `TreatmentFunction` component provides the variant number and all experiment variables to a render function, giving you more flexibility.

```jsx
import React from "react";
import { TreatmentFunction } from "@absmartly/react-sdk";

function PricingExperiment() {
  return (
    <TreatmentFunction name="exp_pricing">
      {({ variant, variables }) => (
        <div>
          <p>Variant: {variant}</p>
          <p>Price: {variables.price || "$9.99"}</p>
        </div>
      )}
    </TreatmentFunction>
  );
}
```

### Using the useABSmartly Hook

For direct access to the SDK and context:

```jsx
import React from "react";
import { useABSmartly } from "@absmartly/react-sdk";

function MyComponent() {
  const { context, sdk } = useABSmartly();

  const handleClick = () => {
    const treatment = context.treatment("exp_test_experiment");
    console.log("Current treatment:", treatment);

    context.track("button_clicked", {
      timestamp: Date.now(),
    });
  };

  return <button onClick={handleClick}>Track Event</button>;
}
```

### Treatment Variables

Access variable values associated with treatments:

```jsx
import React from "react";
import { useABSmartly } from "@absmartly/react-sdk";

function ThemedButton() {
  const { context } = useABSmartly();

  React.useEffect(() => {
    context.ready().then(() => {
      const buttonColor = context.variableValue("button.color", "red");
      const buttonText = context.variableValue("button.text", "Click Me");
      console.log("Button config:", { buttonColor, buttonText });
    });
  }, [context]);

  return <button>Themed Button</button>;
}
```

### Peek at Treatment Variants

Check a treatment without triggering an exposure event. This is useful for analytics or logging purposes where you need the variant but don't want to count it as an actual exposure.

Using the `useTreatment` hook with `peek = true`:

```jsx
import React from "react";
import { useTreatment } from "@absmartly/react-sdk";

function FeaturePreview() {
  const { variant } = useTreatment("exp_test_experiment", true);

  return <div>Preview variant: {variant}</div>;
}
```

Or with the context directly:

```jsx
import React from "react";
import { useABSmartly } from "@absmartly/react-sdk";

function FeatureCheck() {
  const { context } = useABSmartly();
  const [peekedVariant, setPeekedVariant] = React.useState(null);

  React.useEffect(() => {
    context.ready().then(() => {
      const variant = context.peek("exp_test_experiment");
      setPeekedVariant(variant);
    });
  }, [context]);

  return <div>Variant (no exposure): {peekedVariant}</div>;
}
```

### Overriding Treatment Variants

During development, it is useful to force a treatment for an experiment. This can be achieved with the `override()` and/or `overrides()` methods. These methods can be called before the context is ready.

```jsx
import React from "react";
import { useABSmartly } from "@absmartly/react-sdk";

function DevTools() {
  const { context } = useABSmartly();

  React.useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      context.override("exp_test_experiment", 1);

      context.overrides({
        exp_test_experiment: 1,
        exp_another_experiment: 0,
      });
    }
  }, [context]);

  return <div>Dev Tools Active</div>;
}
```

## Advanced

### Context Attributes

Attributes are used to pass meta-data about the user and/or the request. They can be used later in the Web Console to create segments or audiences. They can be set using the `attribute()` or `attributes()` methods, before or after the context is ready.

```jsx
import React from "react";
import { useABSmartly } from "@absmartly/react-sdk";

function App() {
  const { context } = useABSmartly();

  React.useEffect(() => {
    context.attribute("user_agent", navigator.userAgent);

    context.attributes({
      customer_age: "new_customer",
      subscription_tier: "premium",
    });
  }, [context]);

  return <div>App Content</div>;
}
```

### Custom Assignments

Sometimes it may be necessary to override the automatic selection of a variant. For example, if you wish to have your variant chosen based on data from an API call. This can be accomplished using the `customAssignment()` method.

```jsx
context.customAssignment("exp_test_experiment", 1);

context.customAssignments({
  exp_test_experiment: 1,
});
```

### Tracking Goals

Goals are created in the A/B Smartly web console.

```jsx
import React from "react";
import { useABSmartly } from "@absmartly/react-sdk";

function CheckoutButton() {
  const { context } = useABSmartly();

  const handleCheckout = () => {
    context.track("payment", {
      item_count: 1,
      total_amount: 1999.99,
      currency: "USD",
    });
  };

  return <button onClick={handleCheckout}>Complete Purchase</button>;
}
```

### Publishing Pending Data

Sometimes it is necessary to ensure all events have been published to the A/B Smartly collector, before proceeding. One such case is when the user is about to navigate away right before being exposed to a treatment. You can explicitly call the `publish()` method, which returns a promise.

```jsx
import React from "react";
import { useABSmartly } from "@absmartly/react-sdk";
import { useNavigate } from "react-router-dom";

function NavigateAway() {
  const { context } = useABSmartly();
  const navigate = useNavigate();

  const handleNavigate = async () => {
    await context.publish();
    navigate("/next-page");
  };

  return <button onClick={handleNavigate}>Go to Next Page</button>;
}
```

### Finalizing the Context

The `finalize()` method will ensure all events have been published to the A/B Smartly collector, like `publish()`, and will also "seal" the context, throwing an error if any method that could generate an event is called.

```jsx
import React from "react";
import { useABSmartly } from "@absmartly/react-sdk";

function Logout() {
  const { context } = useABSmartly();

  const handleLogout = async () => {
    await context.finalize();
    window.location.href = "/login";
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

### Resetting the Context

When a user's identity changes (e.g., login/logout), reset the context with new units. The `resetContext` method finalizes the old context and creates a new one with pre-fetched data to avoid a round-trip.

```jsx
import React from "react";
import { useABSmartly } from "@absmartly/react-sdk";

function LoginForm() {
  const { resetContext } = useABSmartly();

  const handleLogin = async (userId) => {
    await resetContext(
      { units: { user_id: userId } },
      { publishDelay: 100 }
    );
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleLogin("new-user-id");
    }}>
      <button type="submit">Login</button>
    </form>
  );
}
```

### Using a Custom Event Logger

The A/B Smartly SDK can be instantiated with an event logger used for all contexts. In addition, an event logger can be specified when creating a particular context.

```jsx
import React from "react";
import SDKProvider from "@absmartly/react-sdk";

const customEventLogger = (context, eventName, data) => {
  switch (eventName) {
    case "exposure":
      console.log("User exposed to experiment:", data.name);
      break;
    case "goal":
      console.log("Goal tracked:", data.name);
      break;
    case "error":
      console.error("SDK error:", data);
      break;
    case "ready":
      console.log("Context ready");
      break;
    case "refresh":
      console.log("Context refreshed");
      break;
    case "publish":
      console.log("Events published");
      break;
    case "finalize":
      console.log("Context finalized");
      break;
  }
};

function App() {
  const sdkOptions = {
    endpoint: "https://your-company.absmartly.io/v1",
    apiKey: process.env.REACT_APP_ABSMARTLY_API_KEY,
    environment: process.env.NODE_ENV,
    application: "website",
    eventLogger: customEventLogger,
  };

  return (
    <SDKProvider sdkOptions={sdkOptions} contextOptions={{ units: {} }}>
      {/* Your app */}
    </SDKProvider>
  );
}
```

**Event Types**

| Event        | When                                                  | Data                                          |
| :----------- | :---------------------------------------------------- | :-------------------------------------------- |
| `"error"`    | Context receives an error                             | Error object thrown                           |
| `"ready"`    | Context turns ready                                   | Data used to initialize the context           |
| `"refresh"`  | `context.refresh()` method succeeds                   | Data used to refresh the context              |
| `"publish"`  | `context.publish()` method succeeds                   | Data sent to the A/B Smartly event collector  |
| `"exposure"` | `context.treatment()` succeeds on first exposure      | Exposure data enqueued for publishing         |
| `"goal"`     | `context.track()` method succeeds                     | Goal data enqueued for publishing             |
| `"finalize"` | `context.finalize()` method succeeds the first time   | undefined                                     |

## React-Specific Patterns

### Using with TypeScript

The React SDK exports TypeScript types for all public APIs.

```tsx
import React from "react";
import SDKProvider, {
  useABSmartly,
  useTreatment,
} from "@absmartly/react-sdk";
import type {
  SDKOptionsType,
  ContextOptionsType,
} from "@absmartly/react-sdk";

const sdkOptions: SDKOptionsType = {
  endpoint: "https://your-company.absmartly.io/v1",
  apiKey: process.env.REACT_APP_ABSMARTLY_API_KEY!,
  environment: process.env.NODE_ENV,
  application: "website",
};

const contextOptions: ContextOptionsType = {
  units: {
    session_id: "5ebf06d8cb5d8137290c4abb64155584fbdb64d8",
  },
};

function MyComponent(): JSX.Element {
  const { variant, loading, error } = useTreatment("exp_test");

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>Variant: {variant}</div>;
}
```

### Server-Side Rendering (SSR)

For Next.js or other SSR frameworks, create the context on the server and pass it to the provider:

```jsx
// pages/_app.js
import SDKProvider, { SDK } from "@absmartly/react-sdk";

function MyApp({ Component, pageProps, absmartlyContext }) {
  return (
    <SDKProvider context={absmartlyContext}>
      <Component {...pageProps} />
    </SDKProvider>
  );
}

MyApp.getInitialProps = async (appContext) => {
  const sdk = new SDK({
    endpoint: "https://your-company.absmartly.io/v1",
    apiKey: process.env.ABSMARTLY_API_KEY,
    environment: process.env.NODE_ENV,
    application: "website",
  });

  const context = sdk.createContext({
    units: {
      session_id: appContext.ctx.req?.cookies?.session_id || "guest",
    },
  });

  await context.ready();

  return {
    absmartlyContext: context,
  };
};

export default MyApp;
```

### Higher-Order Component (HOC)

For class components that cannot use hooks, use the `withABSmartly` HOC:

```jsx
import React from "react";
import { withABSmartly } from "@absmartly/react-sdk";

class MyComponent extends React.Component {
  componentDidMount() {
    const { absmartly } = this.props;
    absmartly.context.ready().then(() => {
      const treatment = absmartly.context.treatment("exp_test");
      console.log("Treatment:", treatment);
    });
  }

  render() {
    return <div>My Component</div>;
  }
}

export default withABSmartly(MyComponent);
```

The HOC injects an `absmartly` prop with the following shape:

```typescript
{
  sdk: ABSmartlySDK;
  context: ABSmartlyContext;
  resetContext: (params, options?) => Promise<void>;
}
```

## API Reference

### Hooks

#### `useTreatment(name: string, peek?: boolean)`

Gets the treatment variant for an experiment.

**Parameters:**
- `name` - Experiment name
- `peek` - If true, does not trigger an exposure event (default: `false`)

**Returns:**
```typescript
{
  variant: number | null;
  loading: boolean;
  error: Error | null;
  context: ABSmartlyContext;
}
```

#### `useABSmartly()`

Returns the SDK instance, context, and reset function. Throws if used outside of `SDKProvider`.

**Returns:**
```typescript
{
  sdk: ABSmartlySDK;
  context: ABSmartlyContext;
  resetContext: (params: ContextRequestType, options?: ContextOptionsType) => Promise<void>;
  contextError?: Error | null;
}
```

#### `useContextReady(options)`

Low-level hook for waiting on context readiness. Used internally by `Treatment` and `TreatmentFunction`.

**Options:**
```typescript
{
  context: Context;
  name: string;
  attributes?: Record<string, unknown>;
  onReady?: (context: Context) => void;
}
```

**Returns:**
```typescript
{
  loading: boolean;
  error: Error | null;
}
```

### Components

#### `<SDKProvider>`

Provider component that initializes the SDK and makes it available to child components.

**Props (option 1 - automatic context creation):**
```typescript
{
  sdkOptions: SDKOptionsType;
  contextOptions: { units: Record<string, any> };
  children?: ReactNode;
}
```

**Props (option 2 - pre-initialized context):**
```typescript
{
  context: ABSmartlyContext;
  children?: ReactNode;
}
```

#### `<Treatment>`

Declarative component for rendering different treatment variants.

**Props:**
```typescript
{
  name: string;
  context?: Context;
  attributes?: Record<string, unknown>;
  loadingComponent?: ReactNode;
  children?: ReactNode;
}
```

#### `<TreatmentVariant>`

Child component of `<Treatment>` that defines a specific variant.

**Props:**
```typescript
{
  variant: number | string;
  children?: ReactNode;
}
```

#### `<TreatmentFunction>`

Render-prop component that provides variant and variables to a render function.

**Props:**
```typescript
{
  name: string;
  context?: Context;
  attributes?: Record<string, unknown>;
  loadingComponent?: ReactNode;
  children: (props: { variant: number; variables: Record<string, any> }) => ReactNode;
}
```

### HOC

#### `withABSmartly(Component)`

Higher-order component that injects an `absmartly` prop into a class component.

## About A/B Smartly

**A/B Smartly** is the leading provider of state-of-the-art, on-premises, full-stack experimentation platforms for engineering and product teams that want to confidently deploy features as fast as they can develop them. A/B Smartly's real-time analytics helps engineering and product teams ensure that new features will improve the customer experience without breaking or degrading performance and/or business metrics.

### Have a look at our growing list of clients and SDKs:
- [JavaScript SDK](https://www.github.com/absmartly/javascript-sdk)
- [React SDK](https://www.github.com/absmartly/react-sdk) (this package)
- [Vue2 SDK](https://www.github.com/absmartly/vue2-sdk)
- [Vue3 SDK](https://www.github.com/absmartly/vue3-sdk)
- [Java SDK](https://www.github.com/absmartly/java-sdk)
- [Android SDK](https://www.github.com/absmartly/android-sdk)
- [Swift SDK](https://www.github.com/absmartly/swift-sdk)
- [Dart SDK](https://www.github.com/absmartly/dart-sdk)
- [Flutter SDK](https://www.github.com/absmartly/flutter-sdk)
- [PHP SDK](https://www.github.com/absmartly/php-sdk)
- [Python3 SDK](https://www.github.com/absmartly/python3-sdk)
- [Go SDK](https://www.github.com/absmartly/go-sdk)
- [Ruby SDK](https://www.github.com/absmartly/ruby-sdk)
- [.NET SDK](https://www.github.com/absmartly/dotnet-sdk)
- [Rust SDK](https://www.github.com/absmartly/rust-sdk)
