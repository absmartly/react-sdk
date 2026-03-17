# Contributing to the ABsmartly React SDK

The ABsmartly React SDK is an open-source project, and we welcome your
feedback and contributions. This guide provides information on how to build
and test the project, and how to submit a pull request.

## Development

### Development Process

1. **Fork and Branch**: Fork the repository and create a topic branch from the
   `main` branch. Use a descriptive name for your branch.
2. **Commit Messages**: Use descriptive commit messages. Avoid short or vague
   messages like "fix bug".
3. **Testing**: Add tests for both positive and negative cases to ensure
   comprehensive coverage.
4. **Linting**: Run the linter script and fix any issues. This helps maintain
   code quality and consistency.
5. **Building**: Run the build script to ensure it completes without errors.
6. **Testing**: Run all tests to ensure there are no failures.
7. **Push Changes**: Push your changes to GitHub in your topic branch.
8. **Pull Request**: Open a pull request from your forked repo into the `main`
   branch of the original repository.
9. **PR Template**: Fill out all applicable fields in the pull request template.
10. **Conflict Check**: Ensure there are no conflicts with the `main` branch
    when creating the pull request.
11. **Feedback**: Monitor your pull request for any feedback or comments from
    the ABsmartly SDK team.

### Building the SDK

The SDK supports different environments and module formats. The available
builds are:

- ESM build
- CommonJS modules compatible build

Generate all builds with the command:

```bash
npm run build
```

Refer to the [package.json](package.json) file for more details on the build scripts.

### Running Tests

The project includes unit tests for both client and server-side environments.
Run all tests with the command:

```bash
npm run test
```

For additional testing scripts and more information on how they work, refer to
the [package.json](package.json) file.

## Contact

If you have any questions or need further assistance, you can reach us at
<support@absmartly.com> or on your company's dedicated ABsmartly Slack Connect
channel.

---

Thank you for contributing to the ABsmartly React SDK! Your efforts help us
improve and grow our open-source community.
