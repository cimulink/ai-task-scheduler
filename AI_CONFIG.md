# AI Provider Configuration

This application supports multiple AI providers for task generation, estimation, and assignment. You can configure which provider to use via environment variables.

## Supported Providers

### 1. Mock Provider (Default)
- **Provider**: `mock`
- **Description**: Uses pre-defined mock data for testing and development
- **Requirements**: No API keys needed
- **Pros**: Fast, reliable, no API costs
- **Cons**: Not truly intelligent, limited variety

### 2. OpenRouter
- **Provider**: `openrouter`
- **Description**: Access to multiple LLMs via OpenRouter API
- **Requirements**: OpenRouter API key
- **Pros**: Multiple model options, competitive pricing, good reliability
- **Cons**: Requires API key and credits

### 3. Google Gemini
- **Provider**: `gemini`
- **Description**: Google's Gemini AI models
- **Requirements**: Google AI API key
- **Pros**: High quality responses, generous free tier
- **Cons**: May have rate limits

## Environment Variables

Add these variables to your `.env.local` file:

```env
# AI Provider Selection
AI_PROVIDER="mock"  # Options: "openrouter", "gemini", "mock"

# OpenRouter Configuration (when AI_PROVIDER="openrouter")
OPENROUTER_API_KEY="your-openrouter-api-key"
OPENROUTER_MODEL_NAME="meta-llama/llama-3.1-8b-instruct:free"  # Optional, defaults to free model

# Gemini Configuration (when AI_PROVIDER="gemini")
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL_NAME="gemini-1.5-flash"  # Optional, defaults to gemini-1.5-flash
```

## Getting API Keys

### OpenRouter
1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Add credits to your account
3. Generate an API key in your dashboard
4. Copy the key to `OPENROUTER_API_KEY`

### Google Gemini
1. Visit [Google AI Studio](https://aistudio.google.com)
2. Sign in with your Google account
3. Generate an API key
4. Copy the key to `GEMINI_API_KEY`

## Model Options

### OpenRouter Models
Popular free/cheap options:
- `meta-llama/llama-3.1-8b-instruct:free` (Free)
- `mistralai/mistral-7b-instruct:free` (Free)
- `google/gemma-7b-it:free` (Free)

Premium options:
- `anthropic/claude-3.5-sonnet`
- `openai/gpt-4o`
- `google/gemini-pro-1.5`

### Gemini Models
- `gemini-1.5-flash` (Fast and efficient)
- `gemini-1.5-pro` (More capable, slower)
- `gemini-1.0-pro` (Earlier version)

## Switching Providers

To switch providers:

1. Update the `AI_PROVIDER` variable in your `.env.local`
2. Add the required API key(s)
3. Restart your development server
4. Test with a new project to see the changes

## Fallback Behavior

If an AI provider fails:
- OpenRouter/Gemini services will fall back to mock data
- Error messages are logged but don't break the user experience
- The application continues to work with reasonable default tasks

## Development vs Production

**Development:**
- Use `mock` provider for consistent testing
- Switch to real providers when testing AI features

**Production:**
- Always use real providers (`openrouter` or `gemini`)
- Monitor API usage and costs
- Set up proper error handling and monitoring

## Cost Considerations

**Mock Provider:** Free
**OpenRouter:** Pay per request (varies by model)
**Gemini:** Generous free tier, then pay per request

For development, start with `mock`, then test with real providers before production deployment.