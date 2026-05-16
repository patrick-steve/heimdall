from backend.agents.base import Agent


class Coordinator(Agent):
    """Top-of-chain orchestrator. Receives user prompts, delegates to others."""
