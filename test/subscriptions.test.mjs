import { before, after, beforeEach, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { ZeroAddress } from 'ethers';
import { setup, mined } from './helpers.mjs';

let f, snapshot;
before(async () => { f = await setup('DecentSubscriptionsV1'); });
after(async () => f?.close());
beforeEach(async () => { snapshot = await f.provider.send('evm_snapshot', []); });
afterEach(async () => { await f.provider.send('evm_revert', [snapshot]); });
const plan = (asset = ZeroAddress) => mined(f.contract.createPlan(asset, 100, 100, 'access:public-hash'));
const subscribe = (periods = 1n) => mined(f.contract.connect(f.signers[1]).subscribe(1, f.addresses[1], periods, { value: periods * 100n }));

test('immutable plan terms, sponsored beneficiary, and no custody', async () => {
  const receipt = await plan();
  assert.equal(f.contract.interface.parseLog(receipt.logs[0]).name, 'PlanCreated');
  await mined(f.contract.subscribe(1, f.addresses[1], 2, { value: 200 }));
  assert.equal(await f.contract.isActive(1, f.addresses[1]), true);
  assert.equal(await f.contract.isActive(1, f.addresses[0]), false);
  assert.equal(await f.provider.send('eth_getBalance', [f.contract.target, 'latest']), '0x0');
});

test('active renewal extends existing expiry; expired renewal starts now', async () => {
  await plan();
  await subscribe();
  const first = await f.contract.expiry(1, f.addresses[1]);
  await subscribe(2n);
  assert.equal(await f.contract.expiry(1, f.addresses[1]), first + 200n);
  await f.advance(301);
  assert.equal(await f.contract.isActive(1, f.addresses[1]), false);
  await subscribe();
  assert.equal(await f.contract.expiry(1, f.addresses[1]), BigInt(await f.now()) + 100n);
});

test('cancel is subscriber-only, forfeits access with no refund, and permits fresh purchase', async () => {
  await plan();
  await subscribe();
  await assert.rejects(() => f.contract.cancel(1));
  await mined(f.contract.connect(f.signers[1]).cancel(1));
  assert.equal(await f.contract.isActive(1, f.addresses[1]), false);
  await assert.rejects(() => f.contract.connect(f.signers[1]).cancel(1));
  await subscribe();
  assert.equal(await f.contract.isActive(1, f.addresses[1]), true);
});

test('merchant can stop new purchases without revoking prepaid access', async () => {
  await plan();
  await subscribe();
  await assert.rejects(() => f.contract.connect(f.signers[1]).setEnabled(1, false));
  await mined(f.contract.setEnabled(1, false));
  assert.equal(await f.contract.isActive(1, f.addresses[1]), true);
  await assert.rejects(() => subscribe());
  await mined(f.contract.setEnabled(1, true));
  await subscribe();
});

test('ERC20 collection and exact direct payment to merchant', async () => {
  await plan(f.token.target);
  await mined(f.contract.connect(f.signers[1]).subscribe(1, f.addresses[1], 2));
  assert.equal(await f.token.balanceOf(f.addresses[0]), 1000200n);
  assert.equal(await f.token.balanceOf(f.addresses[1]), 999800n);
  assert.equal(await f.token.balanceOf(f.contract.target), 0n);
});

test('zero terms, EOA asset, unknown plan, zero beneficiary and wrong amount reject', async () => {
  await assert.rejects(() => f.contract.createPlan(ZeroAddress, 0, 100, ''));
  await assert.rejects(() => f.contract.createPlan(ZeroAddress, 100, 0, ''));
  await assert.rejects(() => plan(f.addresses[2]));
  await assert.rejects(() => f.contract.subscribe(999, f.addresses[1], 1, { value: 100 }));
  await plan();
  await assert.rejects(() => subscribe(0n));
  await assert.rejects(() => f.contract.subscribe(1, ZeroAddress, 1, { value: 100 }));
  await assert.rejects(() => f.contract.subscribe(1, f.addresses[1], 1, { value: 99 }));
  await assert.rejects(() => f.contract.subscribe(1, f.addresses[1], 2n ** 256n - 1n));
});

test('false-return, fee-on-transfer, allowance, and accidental native payment preserve expiry', async () => {
  await plan(f.token.target);
  const pay = () => f.contract.connect(f.signers[1]).subscribe(1, f.addresses[1], 1);
  await mined(f.token.connect(f.signers[1]).approve(f.contract.target, 0));
  await assert.rejects(pay);
  await mined(f.token.connect(f.signers[1]).approve(f.contract.target, 1000));
  await mined(f.token.configure(true, false));
  await assert.rejects(pay);
  await mined(f.token.configure(false, true));
  await assert.rejects(pay);
  await assert.rejects(() => subscribe());
  assert.equal(await f.contract.expiry(1, f.addresses[1]), 0n);
  assert.equal(await f.token.balanceOf(f.addresses[1]), 1000000n);
});

test('non-returning token works', async () => {
  const token = await f.deploy('NoReturnToken');
  await mined(token.mint(f.addresses[1], 100));
  await mined(token.connect(f.signers[1]).approve(f.contract.target, 100));
  await plan(token.target);
  await mined(f.contract.connect(f.signers[1]).subscribe(1, f.addresses[1], 1));
  assert.equal(await token.balanceOf(f.addresses[0]), 100n);
});

test('sender-side token fee cannot overcharge the sponsor or grant access', async () => {
  await plan(f.token.target);
  await mined(f.token.configureSenderFee(true));
  await assert.rejects(() => f.contract.connect(f.signers[1]).subscribe(1, f.addresses[2], 1));
  assert.equal(await f.contract.expiry(1, f.addresses[2]), 0n);
  assert.equal(await f.token.balanceOf(f.addresses[1]), 1000000n);
});

test('rejecting merchant restores expiry, reentrant purchase is blocked', async () => {
  const receiver = await f.deploy('Receiver');
  await mined(receiver.execute(f.contract.target, f.contract.interface.encodeFunctionData('createPlan', [ZeroAddress, 100, 100, 'public'])));
  await mined(receiver.configure(true, ZeroAddress, '0x'));
  await assert.rejects(() => subscribe());
  assert.equal(await f.contract.expiry(1, f.addresses[1]), 0n);
  await mined(receiver.configure(false, f.contract.target, f.contract.interface.encodeFunctionData('subscribe', [1, f.addresses[1], 1])));
  await subscribe();
  assert.equal(await receiver.callbackSucceeded(), false);
});
