import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const sources = await Promise.all(['contract.js', 'subscriptionApp.js'].map(file =>
  readFile(new URL(`../public/scripts/${file}`, import.meta.url), 'utf8')));

function fixture() {
  const account = '0x' + '1'.repeat(40), address = '0x' + '3'.repeat(40);
  const nodes = new Map(), writes = [], alerts = [];
  const handlers = new Map();
  let ready;
  const state = { connected: true, address: account, chainId: '0x89' };
  const node = id => {
    if (!nodes.has(id)) {
      const classes = new Set(['hidden']);
      nodes.set(id, { value: '2', style: {}, classList: {
        add: name => classes.add(name), remove: name => classes.delete(name),
        contains: name => classes.has(name),
      }, replaceChildren() {}, addEventListener() {} });
    }
    return nodes.get(id);
  };
  const provider = { getNetwork: async () => ({ chainId: 137 }), getCode: async () => '0x1234', getSigner: () => ({}) };
  const tx = async (...args) => { writes.push(args); return { wait: async () => ({ status: 1 }) }; };
  const contract = {
    address, owner: async () => account,
    subscriptionFee: async () => ({ mul: months => 7n * BigInt(months), toString: () => '7' }),
    subscribe: tx, cancelSubscription: tx, updateSubscriptionFee: tx, isSubscribed: async () => false,
  };
  const context = vm.createContext({
    window: { DecentHead: { getWallet: () => ({ snapshot: () => ({ ...state }) }) },
      addEventListener: (name, handler) => handlers.set(name, handler) },
    document: { getElementById: node, addEventListener: (name, handler) => { if (name === 'DOMContentLoaded') ready = handler; } },
    console: { log() {}, error() {} }, alert: text => alerts.push(text),
    fetch: async () => ({ ok: true, json: async () => [] }),
    ethers: { Contract: function () { return contract; }, utils: {
      hexlify: value => value, parseUnits: value => value, formatUnits: value => String(value),
    } },
  });
  sources.forEach(source => vm.runInContext(source, context));
  context.fixtureProvider = provider;
  context.fixtureAccount = account;
  context.fixtureContract = contract;
  vm.runInContext('walletProvider = fixtureProvider; userAddress = fixtureAccount; subscriptionContract = fixtureContract;', context);
  return { context, state, provider, contract, writes, alerts, node, ready: () => ready(),
    emit: (name, detail) => handlers.get(name)({ detail }) };
}

test('legacy explicit subscription uses exact fee times months; cancel remains explicit', async () => {
  const f = fixture();
  assert.equal(f.writes.length, 0);
  await f.context.subscribeUser();
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0][0], 2);
  assert.equal(f.writes[0][1].value, 14n);
  await f.context.cancelSubscription();
  assert.equal(f.writes.length, 2);
});

test('legacy missing bytecode, wrong chain and disconnect block every payment action', async () => {
  for (const failure of ['code', 'chain', 'disconnect']) {
    const f = fixture();
    if (failure === 'code') f.provider.getCode = async () => '0x';
    if (failure === 'chain') f.state.chainId = '0xa';
    if (failure === 'disconnect') f.state.connected = false;
    await f.context.subscribeUser();
    await f.context.cancelSubscription();
    await f.context.updateSubscriptionFee('1');
    assert.equal(f.writes.length, 0, failure);
    assert.equal(f.alerts.length, 3);
  }
});

test('legacy fee update requires current verified owner', async () => {
  const f = fixture();
  f.contract.owner = async () => '0x' + '2'.repeat(40);
  await f.context.updateSubscriptionFee('1');
  assert.equal(f.writes.length, 0);
  f.contract.owner = async () => f.state.address;
  await f.context.updateSubscriptionFee('1');
  assert.equal(f.writes.length, 1);
});

test('legacy rejects session change while reading fee before submitting payment', async () => {
  const f = fixture();
  f.contract.subscriptionFee = async () => {
    f.state.address = '0x' + '2'.repeat(40);
    return { mul: months => 7n * BigInt(months), toString: () => '7' };
  };
  await f.context.subscribeUser();
  assert.equal(f.writes.length, 0);
});

test('legacy initialization rejects missing bytecode and stale owner result without enabling owner UI', async () => {
  const f = fixture();
  f.provider.getCode = async () => '0x';
  await assert.rejects(f.context.initializeContract(f.contract.address), /deployment unavailable/);
  f.provider.getCode = async () => '0x1234';
  f.contract.owner = async () => {
    f.state.address = '0x' + '2'.repeat(40);
    return f.state.address;
  };
  await assert.rejects(f.context.initializeContract(f.contract.address), /session changed/);
  assert.equal(f.node('updateFeeControl').classList.contains('hidden'), true);
});

test('legacy disconnect clears stale access, inline goodies visibility, fee and owner controls', async () => {
  const f = fixture();
  await f.ready();
  for (const id of ['subscriptionGoodies', 'updateFeeControl', 'subscriber-address', 'influencer-address']) {
    f.node(id).classList.remove('hidden');
  }
  f.node('subscriptionGoodies').style.display = 'block';
  f.emit('decenthead:wallet', { connected: false });
  assert.equal(f.node('subscriptionGoodies').style.display, 'none');
  for (const id of ['subscriptionGoodies', 'updateFeeControl', 'subscriber-address', 'influencer-address']) {
    assert.equal(f.node(id).classList.contains('hidden'), true, id);
  }
  assert.equal(f.node('subscribeButton').disabled, true);
  assert.equal(f.node('cancelButton').disabled, true);
  assert.match(f.node('feeAmount').textContent, /Unavailable/);
  await assert.rejects(f.context.verifyLegacyOperation(), /session changed/);
});
