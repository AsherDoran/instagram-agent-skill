import { handler, ok } from '@/lib/http';
import { AGENT_LIST } from '@/lib/agents';
export const GET = handler(async () => ok({ agents: AGENT_LIST.map((a) => ({ id: a.id, name: a.name, actions: Object.entries(a.actions).map(([k, v]) => ({ id: k, label: v.label, consequential: !!v.consequential })) })) }));
