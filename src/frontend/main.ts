import { laceConnector, type WalletState } from './wallet.js';
import { zkProver, type PublicLedgerState, type BallotTransaction } from './zk-prover.js';

// DOM Elements
const laceConnectBtn = document.getElementById('lace-connect-btn') as HTMLButtonElement;
const walletBtnText = document.getElementById('wallet-btn-text') as HTMLSpanElement;
const walletDot = document.getElementById('wallet-dot') as HTMLSpanElement;
const walletBalances = document.getElementById('wallet-balances') as HTMLDivElement;
const dustVal = document.getElementById('dust-val') as HTMLSpanElement;
const tnightVal = document.getElementById('tnight-val') as HTMLSpanElement;

// Tab Elements
const tab1 = document.getElementById('tab-1') as HTMLButtonElement;
const tab2 = document.getElementById('tab-2') as HTMLButtonElement;
const tab3 = document.getElementById('tab-3') as HTMLButtonElement;
const sectionTab1 = document.getElementById('section-tab-1') as HTMLElement;
const sectionTab2 = document.getElementById('section-tab-2') as HTMLElement;
const sectionTab3 = document.getElementById('section-tab-3') as HTMLElement;

const navBtnProposals = document.getElementById('nav-btn-proposals') as HTMLButtonElement;
const navBtnAllowlist = document.getElementById('nav-btn-allowlist') as HTMLButtonElement;
const navBtnExplorer = document.getElementById('nav-btn-explorer') as HTMLButtonElement;

// Stats Elements
const yesPercentText = document.getElementById('yes-percent-text') as HTMLSpanElement;
const progressYesBar = document.getElementById('progress-yes-bar') as HTMLDivElement;
const progressNoBar = document.getElementById('progress-no-bar') as HTMLDivElement;
const yesCountText = document.getElementById('yes-count-text') as HTMLSpanElement;
const noCountText = document.getElementById('no-count-text') as HTMLSpanElement;
const totalBallotsCount = document.getElementById('total-ballots-count') as HTMLDivElement;
const merkleLeavesCount = document.getElementById('merkle-leaves-count') as HTMLSpanElement;

// Ballot Choice Elements
const cardYes = document.getElementById('card-yes') as HTMLElement;
const cardNo = document.getElementById('card-no') as HTMLElement;
const radioYes = cardYes?.querySelector('input[type="radio"]') as HTMLInputElement;
const radioNo = cardNo?.querySelector('input[type="radio"]') as HTMLInputElement;

// Nullifier & Secret Key
const nullifierPreview = document.getElementById('nullifier-preview') as HTMLDivElement;
const voterCommitmentDisplay = document.getElementById('voter-commitment-display') as HTMLDivElement;
const btnRegenerateSecret = document.getElementById('btn-regenerate-secret') as HTMLButtonElement;
const btnCastBallot = document.getElementById('btn-cast-ballot') as HTMLButtonElement;
const btnRegisterVoter = document.getElementById('btn-register-voter') as HTMLButtonElement;
const contractChip = document.getElementById('contract-chip') as HTMLSpanElement;

// Modals
const zkModal = document.getElementById('zk-modal') as HTMLDivElement;
const modalCloseBtn = document.getElementById('modal-close-btn') as HTMLButtonElement;
const modalResult = document.getElementById('modal-result') as HTMLDivElement;
const modalReceiptText = document.getElementById('modal-receipt-text') as HTMLParagraphElement;
const modalExplorerBtn = document.getElementById('modal-explorer-btn') as HTMLAnchorElement;

const infoModal = document.getElementById('info-modal') as HTMLDivElement;
const btnToggleInfo = document.getElementById('btn-toggle-info') as HTMLButtonElement;
const infoModalCloseBtn = document.getElementById('info-modal-close-btn') as HTMLButtonElement;

const txTbody = document.getElementById('tx-tbody') as HTMLTableSectionElement;

// Ephemeral voter secret state in browser memory (AES-GCM sealed concept)
let currentVoterSecret = 'voter-seed-' + Math.random().toString(36).substring(2, 15);
let currentSalt = 'salt-' + Math.random().toString(36).substring(2, 15);
let currentChoice: 'YES' | 'NO' = 'YES';

function updateVoterSecrets() {
  const nullifier = zkProver.deriveNullifier(currentVoterSecret);
  const commitment = zkProver.deriveCommitment(currentVoterSecret, currentSalt);

  if (nullifierPreview) {
    nullifierPreview.textContent = nullifier;
  }
  if (voterCommitmentDisplay) {
    voterCommitmentDisplay.textContent = commitment;
  }
}

function refreshLedgerStats() {
  const ledger = zkProver.getLedgerState();
  const total = ledger.totalBallots || 1;
  const yesPct = ((ledger.yesVotes / total) * 100).toFixed(1);
  const noPct = ((ledger.noVotes / total) * 100).toFixed(1);

  if (yesPercentText) yesPercentText.textContent = `${yesPct}% YES`;
  if (progressYesBar) progressYesBar.style.width = `${yesPct}%`;
  if (progressNoBar) progressNoBar.style.width = `${noPct}%`;
  if (yesCountText) yesCountText.textContent = `${ledger.yesVotes.toLocaleString()} YES`;
  if (noCountText) noCountText.textContent = `${ledger.noVotes.toLocaleString()} NO`;
  if (totalBallotsCount) totalBallotsCount.textContent = ledger.totalBallots.toLocaleString();
  if (merkleLeavesCount) merkleLeavesCount.textContent = ledger.merkleTreeLeaves.toLocaleString();

  renderTransactions();
}

function renderTransactions() {
  if (!txTbody) return;
  const txs = zkProver.getTransactions();
  txTbody.innerHTML = txs.map(tx => `
    <tr class="hover:bg-surface-container/40 transition-colors">
      <td class="py-3 px-3 text-primary font-mono text-xs font-medium">${tx.txHash.substring(0, 10)}...${tx.txHash.substring(tx.txHash.length - 4)}</td>
      <td class="py-3 px-3 font-mono text-xs text-on-surface-variant">${tx.nullifier}</td>
      <td class="py-3 px-3">
        <span class="px-2 py-0.5 rounded font-mono text-xs font-semibold ${tx.choice === 'YES' ? 'bg-tertiary/15 text-tertiary' : 'bg-primary/15 text-primary'}">
          ${tx.choice}
        </span>
      </td>
      <td class="py-3 px-3 text-secondary font-mono text-xs">${tx.proofCircuit}</td>
      <td class="py-3 px-3 text-tertiary flex items-center gap-1.5 mt-1.5 font-mono text-xs">
        <span class="material-symbols-outlined text-[14px]">done_all</span> ${tx.status}
      </td>
      <td class="py-3 px-3 text-right">
        <a href="https://explorer.preprod.midnight.network/contract/027562d726f492a9fcca3c4ed7f9e20bdc2846dcaaa17b7d80bc832515dbe00934" target="_blank" class="text-outline hover:text-primary transition-colors inline-block" title="View on Midnight Preprod Explorer">
          <span class="material-symbols-outlined text-[16px]">open_in_new</span>
        </a>
      </td>
    </tr>
  `).join('');
}

// Setup Wallet Integration
laceConnector.subscribe((state: WalletState) => {
  if (state.isConnected) {
    walletBtnText.textContent = `${state.address.substring(0, 12)}...${state.address.substring(state.address.length - 4)}`;
    walletDot.className = 'w-2 h-2 rounded-full bg-tertiary shadow-[0_0_6px_#10b981]';
    laceConnectBtn.className = 'px-3 py-1.5 rounded-lg bg-surface border border-tertiary/50 hover:border-tertiary text-xs font-mono text-tertiary-fixed-dim font-medium flex items-center gap-2 transition-all';
    walletBalances?.classList.remove('hidden');
    walletBalances?.classList.add('flex');
    if (dustVal) dustVal.textContent = state.dustBalance;
    if (tnightVal) tnightVal.textContent = state.tnightBalance;
  } else {
    walletBtnText.textContent = 'Connect Lace Wallet';
    walletDot.className = 'w-2 h-2 rounded-full bg-outline';
    laceConnectBtn.className = 'px-4 py-1.5 rounded-lg bg-surface-container-high border border-primary/40 hover:border-primary text-xs font-mono font-medium flex items-center gap-2 transition-all shadow-[0_0_12px_rgba(139,92,246,0.15)]';
    walletBalances?.classList.add('hidden');
    walletBalances?.classList.remove('flex');
  }
});

laceConnectBtn?.addEventListener('click', async () => {
  const current = laceConnector.getState();
  if (current.isConnected) {
    if (confirm('Disconnect from Lace Preprod wallet?')) {
      laceConnector.disconnect();
    }
  } else {
    await laceConnector.connect();
  }
});

// Setup Tabs
function switchTab(activeId: 1 | 2 | 3) {
  const tabs = [tab1, tab2, tab3];
  const sections = [sectionTab1, sectionTab2, sectionTab3];

  tabs.forEach((t, i) => {
    if (i + 1 === activeId) {
      t.className = 'px-4 py-2 rounded-lg text-white font-medium text-sm bg-surface-container border border-primary/50 shadow-sm flex items-center gap-2 transition-all';
      sections[i]?.classList.remove('hidden');
      sections[i]?.classList.add('flex');
    } else {
      t.className = 'px-4 py-2 rounded-lg text-on-surface-variant hover:text-white font-medium text-sm transition-colors flex items-center gap-2';
      sections[i]?.classList.add('hidden');
      sections[i]?.classList.remove('flex');
    }
  });

  // Nav buttons highlight
  navBtnProposals?.classList.toggle('border-primary', activeId === 1);
  navBtnProposals?.classList.toggle('border-b-2', activeId === 1);
  navBtnAllowlist?.classList.toggle('border-primary', activeId === 2);
  navBtnAllowlist?.classList.toggle('border-b-2', activeId === 2);
  navBtnExplorer?.classList.toggle('border-primary', activeId === 3);
  navBtnExplorer?.classList.toggle('border-b-2', activeId === 3);
}

tab1?.addEventListener('click', () => switchTab(1));
tab2?.addEventListener('click', () => switchTab(2));
tab3?.addEventListener('click', () => switchTab(3));

navBtnProposals?.addEventListener('click', () => switchTab(1));
navBtnAllowlist?.addEventListener('click', () => switchTab(2));
navBtnExplorer?.addEventListener('click', () => switchTab(3));

// Ballot Selection Handlers
function selectChoice(choice: 'YES' | 'NO') {
  currentChoice = choice;
  if (choice === 'YES') {
    radioYes.checked = true;
    radioNo.checked = false;
    cardYes.className = 'relative block card-frost rounded-xl border-2 border-tertiary/70 p-4 cursor-pointer transition-all hover:bg-surface-container/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
    cardNo.className = 'relative block card-frost rounded-xl border border-outline-variant/50 p-4 cursor-pointer transition-all hover:border-primary/60 hover:bg-surface-container/50';
  } else {
    radioNo.checked = true;
    radioYes.checked = false;
    cardNo.className = 'relative block card-frost rounded-xl border-2 border-primary/70 p-4 cursor-pointer transition-all hover:bg-surface-container/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]';
    cardYes.className = 'relative block card-frost rounded-xl border border-outline-variant/50 p-4 cursor-pointer transition-all hover:border-tertiary/60 hover:bg-surface-container/50';
  }
}

cardYes?.addEventListener('click', () => selectChoice('YES'));
cardNo?.addEventListener('click', () => selectChoice('NO'));

btnRegenerateSecret?.addEventListener('click', () => {
  currentVoterSecret = 'voter-seed-' + Math.random().toString(36).substring(2, 15);
  currentSalt = 'salt-' + Math.random().toString(36).substring(2, 15);
  updateVoterSecrets();
});

// Modal Logic
function setModalStep(step: number, message: string) {
  for (let s = 1; s <= 4; s++) {
    const row = document.getElementById(`step-row-${s}`);
    const icon = document.getElementById(`step-icon-${s}`);
    const text = document.getElementById(`step-text-${s}`);

    if (s < step) {
      if (icon) {
        icon.textContent = 'check_circle';
        icon.className = 'material-symbols-outlined text-tertiary text-[18px]';
      }
      row?.classList.add('border-tertiary/40');
      row?.classList.remove('border-primary/40');
    } else if (s === step) {
      if (icon) {
        icon.textContent = 'hourglass_top';
        icon.className = 'material-symbols-outlined text-primary text-[18px] animate-spin';
      }
      if (text) text.textContent = message;
      row?.classList.add('border-primary/50');
      row?.classList.remove('border-tertiary/40');
    } else {
      if (icon) {
        icon.textContent = 'radio_button_unchecked';
        icon.className = 'material-symbols-outlined text-outline text-[18px]';
      }
    }
  }
}

btnCastBallot?.addEventListener('click', async () => {
  const wallet = laceConnector.getState();
  if (!wallet.isConnected) {
    const connectFirst = confirm('Please connect your Lace Wallet on Preprod to sign this zero-knowledge ballot.\n\nConnect Lace now?');
    if (connectFirst) {
      await laceConnector.connect();
    } else {
      return;
    }
  }

  // Open modal
  zkModal.classList.remove('hidden');
  modalResult.classList.add('hidden');
  btnCastBallot.disabled = true;

  try {
    const result = await zkProver.executeCastVoteCircuit(
      currentChoice,
      currentVoterSecret,
      (step, message) => {
        setModalStep(step, message);
      }
    );

    // All steps complete
    for (let s = 1; s <= 4; s++) {
      const icon = document.getElementById(`step-icon-${s}`);
      if (icon) {
        icon.textContent = 'check_circle';
        icon.className = 'material-symbols-outlined text-tertiary text-[18px]';
      }
    }

    modalResult.classList.remove('hidden');
    modalReceiptText.textContent = `Tx Hash: ${result.txHash}\nNullifier: ${result.nullifier}\nPreprod Block Height: #1842916`;
    modalExplorerBtn.href = `https://explorer.preprod.midnight.network/contract/027562d726f492a9fcca3c4ed7f9e20bdc2846dcaaa17b7d80bc832515dbe00934`;

    refreshLedgerStats();
  } catch (err: any) {
    alert(`Circuit execution aborted:\n${err.message}`);
    zkModal.classList.add('hidden');
  } finally {
    btnCastBallot.disabled = false;
  }
});

modalCloseBtn?.addEventListener('click', () => {
  zkModal.classList.add('hidden');
});

// Contract details modal
btnToggleInfo?.addEventListener('click', () => infoModal.classList.remove('hidden'));
contractChip?.addEventListener('click', () => infoModal.classList.remove('hidden'));
infoModalCloseBtn?.addEventListener('click', () => infoModal.classList.add('hidden'));

// Allowlist Registration
btnRegisterVoter?.addEventListener('click', () => {
  const commitment = zkProver.deriveCommitment(currentVoterSecret, currentSalt);
  const res = zkProver.registerVoter(commitment);
  alert(`✅ Voter Identity Enrolled Successfully!\n\nCommitment: ${commitment}\nHistoric Merkle Leaf Index: #${res.leafIndex}\nRoot updated on Midnight Preprod.`);
  refreshLedgerStats();
  switchTab(1);
});

// Initialize on Load
updateVoterSecrets();
refreshLedgerStats();
switchTab(1);
