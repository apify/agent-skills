# CLI-based Actorization

For languages without an SDK (Go, Rust, Java, etc.), create a wrapper script that uses the Apify CLI.

## Create wrapper script

Create `start.sh` in project root:

```bash
#!/bin/bash
set -e

# Get input from Apify key-value store
INPUT=$(apify actor get-input)

# Parse input values (adjust based on your input schema)
MY_PARAM=$(echo "$INPUT" | jq -r '.myParam // "default"')

# Run your application with the input
./your-application --param "$MY_PARAM"

# If your app writes to a file, push it to key-value store
# apify actor set-value OUTPUT --contentType application/json < output.json

# Or push structured data to dataset
# apify actor push-data '{"result": "value"}'
```

## Update Dockerfile

Reference the [cli-start template Dockerfile](https://github.com/apify/actor-templates/blob/master/templates/cli-start/Dockerfile) which includes the `ubi` utility for installing binaries from GitHub releases.

```dockerfile
FROM apify/actor-node:22

# Install ubi for easy GitHub release installation
RUN curl --silent --location \
    https://raw.githubusercontent.com/houseabsolute/ubi/master/bootstrap/bootstrap-ubi.sh | sh

# Install your CLI tool from GitHub releases (example)
# RUN ubi --project your-org/your-tool --in /usr/local/bin

# Or install apify-cli and jq manually
RUN npm install -g apify-cli
RUN apt-get update && apt-get install -y jq

# Copy your application
COPY . .

# Build your application if needed
# RUN ./build.sh

# Make start script executable
RUN chmod +x start.sh

# Run the wrapper script
CMD ["./start.sh"]
```

## Testing CLI-based Actors

For CLI-based Actors (shell wrapper scripts), you may need to test the underlying application directly with mock input, as `apify run` requires a Node.js or Python entry point.

Test your wrapper script locally:

```bash
# Set up mock input
export INPUT='{"myParam": "test-value"}'

# Run wrapper script
./start.sh
```

## CLI commands reference

| Command | Description |
|---------|-------------|
| `apify actor get-input` | Get input JSON from key-value store |
| `apify actor set-value KEY` | Store value in key-value store |
| `apify actor push-data JSON` | Push data to dataset |
| `apify actor get-value KEY` | Retrieve value from key-value store |
