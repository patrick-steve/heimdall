from backend.agents.base import Agent


class Executor(Agent):
    """Side-effectful agent. Signs and broadcasts transactions (or mocks)."""
