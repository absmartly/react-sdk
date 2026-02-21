# A/B Smartly React SDK [![npm version](https://badge.fury.io/js/%40absmartly%2Freact-sdk.svg)](https://badge.fury.io/js/%40absmartly%2Freact-sdk)

React SDK for [A/B Smartly](https://www.absmartly.com/) A/B testing and feature flag platform. This package provides React-specific hooks, components, and providers built on top of the [A/B Smartly JavaScript SDK](https://www.github.com/absmartly/javascript-sdk).

## Compatibility

The A/B Smartly React SDK is compatible with React 16.8+ (requires hooks support).

It works in both client-side and server-side rendering environments (SSR).

**Browser Support:**
- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE 11+ (requires Promise polyfill)

**Note:** IE 10-11 do not natively support Promises. Include a polyfill like [es6-promise](https://www.npmjs.com/package/es6-promise) or [rsvp](https://www.npmjs.com/package/rsvp).

## Getting Started

### Install the SDK

```shell
npm install @absmartly/react-sdk --save
```

### ⚠️ Security Warning

**IMPORTANT:** The API key is exposed in your client-side bundle and can be viewed by anyone inspecting network traffic or JavaScript source.

**Best Practices:**
- Only use **publishable/public keys** with **read-only permissions** in browser applications
- **NEVER** use secret keys with write permissions in client-side code
- For write operations or sensitive API calls, implement a **server-side proxy**:
  ```
  Browser → Your Backend (with secret key) → ABSmartly API
  ```
- Consider implementing token exchange or OAuth-style authentication for production applications

### Import and Initialize the SDK

#### Recommended: Using SDKProvider

Wrap your application with the `SDKProvider` component to make the SDK available throughout your React component tree:

```jsx
import React from 'react';
import ReactDOM from 'react-dom';
import SDKProvider from '@absmartly/react-sdk';
import App from './App';

const sdkOptions = {
  endpoint: 'https://your-company.absmartly.io/v1',
  apiKey: process.env.REACT_APP_ABSMARTLY_API_KEY,
  environment: process.env.NODE_ENV,
  application: 'website',
};

const contextOptions = {
  units: {
    session_id: '5ebf06d8cb5d8137290c4abb64155584fbdb64d8',
  },
};

ReactDOM.render(
  <SDKProvider sdkOptions={sdkOptions} contextOptions={contextOptions}>
    <App />
  </SDKProvider>,
  document.getElementById('root')
);
```

#### Alternative: Using Pre-initialized Context

For SSR or when you need more control, you can create the context beforehand:

```jsx
import React from 'react';
import SDKProvider, { SDK } from '@absmartly/react-sdk';
import App from './App';

const sdk = new SDK({
  endpoint: 'https://your-company.absmartly.io/v1',
  apiKey: process.env.REACT_APP_ABSMARTLY_API_KEY,
  environment: process.env.NODE_ENV,
  application: 'website',
});

const context = sdk.createContext({
  units: {
    session_id: '5ebf06d8cb5d8137290c4abb64155584fbdb64d8',
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

| Config         | Type                                | Required? | Default | Description                                                                                                                                                                   |
| :------------- | :---------------------------------- | :-------: | :-----: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| endpoint       | `string`                            |  &#9989;  | `null`  | The URL to your API endpoint. Most commonly `"your-company.absmartly.io"`                                                                                                    |
| apiKey         | `string`                            |  &#9989;  | `null`  | Your API key which can be found on the Web Console.                                                                                                                          |
| environment    | `string`                            |  &#9989;  | `null`  | The environment of the platform where the SDK is installed. Environments are created on the Web Console and should match the available environments in your infrastructure.  |
| application    | `string`                            |  &#9989;  | `null`  | The name of the application where the SDK is installed. Applications are created on the Web Console and should match the applications where your experiments will be running.|
| retries        | `number`                            |  &#10060; | `5`     | Number of retry attempts for failed HTTP requests                                                                                                                            |
| timeout        | `number`                            |  &#10060; | `3000`  | Connection timeout in milliseconds                                                                                                                                           |
| eventLogger    | `(context, eventName, data) => void`|  &#10060; | `null`  | Callback to handle SDK events (ready, exposure, goal, etc.)                                                                                                                  |

**Context Options**

| Config          | Type      | Required? | Default | Description                                                                  |
| :-------------- | :-------- | :-------: | :-----: | :--------------------------------------------------------------------------- |
| units           | `object`  |  &#9989;  | `{}`    | Map of unit types to unit identifiers (e.g., `{session_id: '...'}`)         |
| publishDelay    | `number`  |  &#10060; | `null`  | Delay in milliseconds before publishing events                              |
| refreshInterval | `number`  |  &#10060; | `null`  | Interval in milliseconds to refresh experiment data                          |

## Basic Usage

### Using the useTreatment Hook

The `useTreatment` hook is the primary way to access experiment treatments in functional components:

```jsx
import React from 'react';
import { useTreatment } from '@absmartly/react-sdk';

function MyButton() {
  const { variant, loading, error } = useTreatment('exp_button_color');

  if (loading) return <button>Loading...</button>;
  if (error) return <button>Error</button>;

  return (
    <button style={{ backgroundColor: variant === 0 ? 'red' : 'blue' }}>
      Click Me
    </button>
  );
}
```

### Using the Treatment Component

For declarative treatment rendering:

```jsx
import React from 'react';
import { Treatment, TreatmentVariant } from '@absmartly/react-sdk';

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

### Using the useABSmartly Hook

For direct access to the SDK and context:

```jsx
import React from 'react';
import { useABSmartly } from '@absmartly/react-sdk';

function MyComponent() {
  const { context, sdk } = useABSmartly();

  const handleClick = () => {
    const treatment = context.treatment('exp_test_experiment');
    console.log('Current treatment:', treatment);

    context.track('button_clicked', {
      timestamp: Date.now(),
    });
  };

  return <button onClick={handleClick}>Track Event</button>;
}
```

### Treatment Variables

Access variable values associated with treatments:

```jsx
import React from 'react';
import { useABSmartly } from '@absmartly/react-sdk';

function ThemedButton() {
  const { context } = useABSmartly();

  React.useEffect(() => {
    context.ready().then(() => {
      const buttonColor = context.variableValue('button.color', 'red');
      const buttonText = context.variableValue('button.text', 'Click Me');
      console.log('Button config:', { buttonColor, buttonText });
    });
  }, [context]);

  return <button>Themed Button</button>;
}
```

### Peek at Treatment Variants

Check treatment without triggering an exposure:

```jsx
import React from 'react';
import { useTreatment } from '@absmartly/react-sdk';

function FeaturePreview() {
  const { variant } = useTreatment('exp_test_experiment', true); // peek = true

  return <div>Preview variant: {variant}</div>;
}
```

Or with the context directly:

```jsx
import React from 'react';
import { useABSmartly } from '@absmartly/react-sdk';

function FeatureCheck() {
  const { context } = useABSmartly();
  const [peekedVariant, setPeekedVariant] = React.useState(null);

  React.useEffect(() => {
    context.ready().then(() => {
      const variant = context.peek('exp_test_experiment');
      setPeekedVariant(variant);
    });
  }, [context]);

  return <div>Variant (no exposure): {peekedVariant}</div>;
}
```

### Overriding Treatment Variants

Override treatments for testing or development:

```jsx
import React from 'react';
import { useABSmartly } from '@absmartly/react-sdk';

function DevTools() {
  const { context } = useABSmartly();

  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      context.override('exp_test_experiment', 1);

      // Or multiple at once
      context.overrides({
        exp_test_experiment: 1,
        exp_another_experiment: 0,
      });
    }
  }, [context]);

  return <div>Dev Tools Active</div>;
}
```

## Advanced Usage

### Setting Extra Units

Add additional units after the context is created:

```jsx
import React from 'react';
import { useABSmartly } from '@absmartly/react-sdk';

function UserProfile() {
  const { context } = useABSmartly();

  const handleLogin = (userId) => {
    context.unit('user_id', userId);

    // Or multiple units
    context.units({
      user_id: userId,
      db_user_id: '1000013',
    });
  };

  return <button onClick={() => handleLogin('user123')}>Login</button>;
}
```

**Note:** You cannot override an already set unit type. Create a new context instead using the `resetContext` method.

### Context Attributes

Set attributes for audience targeting:

```jsx
import React from 'react';
import { useABSmartly } from '@absmartly/react-sdk';

function App() {
  const { context } = useABSmartly();

  React.useEffect(() => {
    context.attribute('user_agent', navigator.userAgent);

    context.attributes({
      customer_age: 'new_customer',
      subscription_tier: 'premium',
    });
  }, [context]);

  return <div>App Content</div>;
}
```

### Tracking Goals

Track goal achievements with optional properties:

```jsx
import React from 'react';
import { useABSmartly } from '@absmartly/react-sdk';

function CheckoutButton() {
  const { context } = useABSmartly();

  const handleCheckout = () => {
    context.track('payment', {
      item_count: 1,
      total_amount: 1999.99,
      currency: 'USD',
    });
  };

  return <button onClick={handleCheckout}>Complete Purchase</button>;
}
```

### Publishing Pending Data

Ensure all events are published before navigation:

```jsx
import React from 'react';
import { useABSmartly } from '@absmartly/react-sdk';
import { useNavigate } from 'react-router-dom';

function NavigateAway() {
  const { context } = useABSmartly();
  const navigate = useNavigate();

  const handleNavigate = async () => {
    await context.publish();
    navigate('/next-page');
  };

  return <button onClick={handleNavigate}>Go to Next Page</button>;
}
```

### Finalizing the Context

Seal the context and publish all pending events:

```jsx
import React from 'react';
import { useABSmartly } from '@absmartly/react-sdk';

function Logout() {
  const { context } = useABSmartly();

  const handleLogout = async () => {
    await context.finalize();
    window.location.href = '/login';
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

### Refreshing Context Data

For long-running single-page applications, refresh experiment data periodically:

```jsx
// Set refresh interval when creating context
const contextOptions = {
  units: {
    session_id: '5ebf06d8cb5d8137290c4abb64155584fbdb64d8',
  },
  refreshInterval: 5 * 60 * 1000, // 5 minutes
};

// Or manually refresh
function RefreshButton() {
  const { context } = useABSmartly();

  const handleRefresh = async () => {
    try {
      await context.refresh();
      console.log('Context refreshed with latest experiment data');
    } catch (error) {
      console.error('Failed to refresh context:', error);
    }
  };

  return <button onClick={handleRefresh}>Refresh Experiments</button>;
}
```

### Resetting the Context

When a user's identity changes (e.g., login/logout), reset the context:

```jsx
import React from 'react';
import { useABSmartly } from '@absmartly/react-sdk';

function LoginForm() {
  const { resetContext } = useABSmartly();

  const handleLogin = async (userId) => {
    await resetContext(
      { units: { user_id: userId } },
      { publishDelay: 100 }
    );
  };

  return <form onSubmit={(e) => {
    e.preventDefault();
    handleLogin('new-user-id');
  }}>
    <button type="submit">Login</button>
  </form>;
}
```

### Custom Event Logger

Implement custom logging for SDK events:

```jsx
import React from 'react';
import SDKProvider from '@absmartly/react-sdk';

const customEventLogger = (context, eventName, data) => {
  switch (eventName) {
    case 'exposure':
      console.log('User exposed to experiment:', data.name);
      // Send to analytics
      break;
    case 'goal':
      console.log('Goal tracked:', data.name);
      break;
    case 'error':
      console.error('SDK error:', data);
      // Send to error tracking service
      break;
    case 'ready':
      console.log('Context ready');
      break;
    case 'refresh':
      console.log('Context refreshed');
      break;
    case 'publish':
      console.log('Events published');
      break;
    case 'finalize':
      console.log('Context finalized');
      break;
  }
};

function App() {
  const sdkOptions = {
    endpoint: 'https://your-company.absmartly.io/v1',
    apiKey: process.env.REACT_APP_ABSMARTLY_API_KEY,
    environment: process.env.NODE_ENV,
    application: 'website',
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

| Event       | When                                           | Data                                     |
| ----------- | ---------------------------------------------- | ---------------------------------------- |
| `error`     | Context receives an error                      | Error object thrown                      |
| `ready`     | Context turns ready                            | Data used to initialize the context      |
| `refresh`   | `context.refresh()` method succeeds            | Data used to refresh the context         |
| `publish`   | `context.publish()` method succeeds            | Data sent to the A/B Smartly collector   |
| `exposure`  | `context.treatment()` succeeds on first exposure| Exposure data enqueued for publishing   |
| `goal`      | `context.track()` method succeeds              | Goal data enqueued for publishing        |
| `finalize`  | `context.finalize()` method succeeds           | undefined                                |

### Using with TypeScript

The React SDK is fully typed:

```tsx
import React from 'react';
import SDKProvider, {
  useABSmartly,
  useTreatment,
  SDKOptionsType,
  ContextOptionsType
} from '@absmartly/react-sdk';

const sdkOptions: SDKOptionsType = {
  endpoint: 'https://your-company.absmartly.io/v1',
  apiKey: process.env.REACT_APP_ABSMARTLY_API_KEY!,
  environment: process.env.NODE_ENV,
  application: 'website',
};

const contextOptions: ContextOptionsType = {
  units: {
    session_id: '5ebf06d8cb5d8137290c4abb64155584fbdb64d8',
  },
};

function MyComponent(): JSX.Element {
  const { variant, loading, error } = useTreatment('exp_test');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>Variant: {variant}</div>;
}
```

### Server-Side Rendering (SSR)

For Next.js or other SSR frameworks:

```jsx
// pages/_app.js
import SDKProvider from '@absmartly/react-sdk';

function MyApp({ Component, pageProps, absmartlyContext }) {
  return (
    <SDKProvider context={absmartlyContext}>
      <Component {...pageProps} />
    </SDKProvider>
  );
}

MyApp.getInitialProps = async (appContext) => {
  // Create context on the server
  const sdk = new SDK({
    endpoint: 'https://your-company.absmartly.io/v1',
    apiKey: process.env.ABSMARTLY_API_KEY,
    environment: process.env.NODE_ENV,
    application: 'website',
  });

  const context = sdk.createContext({
    units: {
      session_id: appContext.ctx.req?.cookies?.session_id || 'guest',
    },
  });

  await context.ready();

  return {
    absmartlyContext: context,
  };
};

export default MyApp;
```

## API Reference

### Hooks

#### `useABSmartly()`

Returns the SDK instance and context.

**Returns:**
```typescript
{
  sdk: ABSmartlySDK,
  context: ABSmartlyContext,
  resetContext: (params, options?) => Promise<void>
}
```

#### `useTreatment(name: string, peek?: boolean)`

Gets the treatment variant for an experiment.

**Parameters:**
- `name` - Experiment name
- `peek` - If true, does not trigger an exposure event (default: false)

**Returns:**
```typescript
{
  variant: number | null,
  loading: boolean,
  error: Error | null,
  context: ABSmartlyContext
}
```

### Components

#### `<SDKProvider>`

Provider component that initializes the SDK and makes it available to child components.

**Props:**
```typescript
{
  sdkOptions: SDKOptionsType,
  contextOptions: ContextOptionsType,
  children: ReactNode
}
// OR
{
  context: ABSmartlyContext,
  children: ReactNode
}
```

#### `<Treatment>`

Declarative component for rendering different treatment variants.

**Props:**
```typescript
{
  name: string,
  context?: Context,
  attributes?: Record<string, unknown>,
  loadingComponent?: ReactNode,
  children?: ReactNode
}
```

#### `<TreatmentVariant>`

Child component of `<Treatment>` that defines a specific variant.

**Props:**
```typescript
{
  variant: number,
  children?: ReactNode
}
```

### HOC

#### `withABSmartly(Component)`

Higher-order component that injects SDK props into a class component.

```jsx
import { withABSmartly } from '@absmartly/react-sdk';

class MyComponent extends React.Component {
  componentDidMount() {
    const { context } = this.props;
    context.ready().then(() => {
      console.log('Ready!');
    });
  }

  render() {
    return <div>My Component</div>;
  }
}

export default withABSmartly(MyComponent);
```

## About A/B Smartly

**A/B Smartly** is the leading provider of state-of-the-art, on-premises, full-stack experimentation platforms for engineering and product teams that want to confidently deploy features as fast as they can develop them.
A/B Smartly's real-time analytics helps engineering and product teams ensure that new features will improve the customer experience without breaking or degrading performance and/or business metrics.

### Have a look at our growing list of clients and SDKs:
- [JavaScript SDK](https://www.github.com/absmartly/javascript-sdk)
- [React SDK](https://www.github.com/absmartly/react-sdk) (this package)
- [Vue2 SDK](https://www.github.com/absmartly/vue2-sdk)
- [Vue3 SDK](https://www.github.com/absmartly/vue3-sdk)
- [Java SDK](https://www.github.com/absmartly/java-sdk)
- [PHP SDK](https://www.github.com/absmartly/php-sdk)
- [Swift SDK](https://www.github.com/absmartly/swift-sdk)
- [Python3 SDK](https://www.github.com/absmartly/python3-sdk)
- [Go SDK](https://www.github.com/absmartly/go-sdk)
- [Ruby SDK](https://www.github.com/absmartly/ruby-sdk)
- [.NET SDK](https://www.github.com/absmartly/dotnet-sdk)
- [Dart SDK](https://www.github.com/absmartly/dart-sdk)
- [Flutter SDK](https://www.github.com/absmartly/flutter-sdk)

## Documentation

- [Full Documentation](https://docs.absmartly.com/)
- [JavaScript SDK Documentation](https://www.github.com/absmartly/javascript-sdk) (underlying SDK)

## License

MIT License - see LICENSE for details.
