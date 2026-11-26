import { Annotation, Command, END, START, StateGraph, interrupt } from '@langchain/langgraph';
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';

const approvalState = Annotation.Root({
  actionId: Annotation(),
  approved: Annotation(),
});
const threadPrefix = 'xinyu-approval:';

export function createApprovalWorkflow(filename, store) {
  const saver = SqliteSaver.fromConnString(filename);
  saver.db.pragma('busy_timeout = 5000');
  const graph = new StateGraph(approvalState)
    .addNode('wait_for_decision', ({ actionId }) => ({ approved: interrupt({ actionId }) }))
    .addNode('apply_decision', ({ approved }, config) => {
      config.context.apply(approved);
      return {};
    })
    .addEdge(START, 'wait_for_decision')
    .addEdge('wait_for_decision', 'apply_decision')
    .addEdge('apply_decision', END)
    .compile({ checkpointer: saver });

  const pending = new Map();
  const configFor = id => ({ configurable: { thread_id: threadPrefix + id }, durability: 'sync' });
  const clear = id => saver.deleteThread(threadPrefix + id);

  function serial(id, work) {
    const operation = (pending.get(id) ?? Promise.resolve()).catch(() => {}).then(work);
    pending.set(id, operation);
    return operation.finally(() => {
      if (pending.get(id) === operation) pending.delete(id);
    });
  }

  async function waitAtCheckpoint(id, config) {
    const state = await graph.getState(config);
    if (state.tasks.some(task => task.interrupts.length)) return;
    // A pending action with no interrupt can be rebuilt from its authoritative SQLite row.
    if (state.config.configurable?.checkpoint_id) await clear(id);
    await graph.invoke({ actionId: id }, config);
  }

  function prepare(scope, id) {
    return serial(id, async () => {
      if (store.getAction(id, scope).status !== 'pending') return;
      await waitAtCheckpoint(id, configFor(id));
      if (!store.isPending(id)) await clear(id);
    });
  }

  function decide(scope, id, approved, body) {
    return serial(id, async () => {
      store.tick();
      const action = store.getAction(id, scope);
      const apply = () => approved ? store.confirm(scope, id, body) : store.reject(scope, id);
      if (!action.run_id || action.status !== 'pending') return apply();

      const config = configFor(id);
      let result;
      try {
        await waitAtCheckpoint(id, config);
        await graph.invoke(new Command({ resume: approved }), {
          ...config,
          context: { apply: decision => {
            if (decision !== approved) throw new Error('Approval decision does not match the request');
            result = apply();
          } },
        });
        if (!result) throw new Error('Approval graph did not apply the decision');
        return result;
      } finally {
        // A failed validation keeps the card pending and the next attempt starts from a clean interrupt.
        await clear(id);
      }
    });
  }

  async function reap() {
    await saver.getTuple(configFor(''));
    const threads = saver.db.prepare('SELECT thread_id FROM checkpoints WHERE thread_id GLOB ? UNION SELECT thread_id FROM writes WHERE thread_id GLOB ?')
      .all(threadPrefix + '*', threadPrefix + '*');
    for (const { thread_id } of threads) {
      const id = thread_id.slice(threadPrefix.length);
      if (!pending.has(id) && !store.isPending(id)) await clear(id);
    }
  }

  return {
    prepare, decide, reap,
    settled: () => Promise.allSettled(pending.values()),
    close: () => saver.db.close(),
  };
}
