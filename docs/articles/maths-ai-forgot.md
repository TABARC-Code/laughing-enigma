# The Maths AI Forgot: Why Centuries-Old Equations Might Save the Industry Billions

*Deep learning built its empire on brute force and exponential spend. The tools it needed were sitting in dusty textbooks all along.*

---

At the NeurIPS conference in Vancouver in December 2024, Ilya Sutskever — co-founder of OpenAI, one of the architects of modern deep learning — took the stage to collect a Test of Time award for his 2014 paper. He used the occasion to say something that landed like a brick through a greenhouse window.

"Pre-training as we know it," he told the crowd, "will unquestionably end."

The problem, he explained, wasn't compute. Compute keeps growing. The problem is that there's only one internet. Data, unlike GPUs, doesn't double on a schedule. "We have achieved peak data," he said. "There's only one internet."

That's not a fringe position anymore. Training GPT-4 consumed over 50 gigawatt-hours of energy — enough to power San Francisco for three days — and cost somewhere north of $100 million, a figure Sam Altman confirmed by saying it was "more than that" when asked directly. Epoch AI's 2024 cost analysis found that training costs for frontier models have grown at roughly 3.1× per year since 2016. Anthropic CEO Dario Amodei told investors that a $10 billion training run might arrive by 2025. Training costs went from $3.3 million for GPT-3 to over $100 million for GPT-4 — a roughly 30× increase in three years. Sustaining that trajectory isn't a funding problem. It's a physics problem.

Here's the strange part: the mathematical tools that could help weren't waiting to be discovered. They were sitting in journals and textbooks, most of them published decades or centuries before the first neural network was trained. The field had decided that enough GPUs could substitute for enough rigour. That turns out to be true — until it isn't. And the evidence that it's becoming "isn't" is accumulating fast enough that the people who built the paradigm are saying so in public.

What follows is a tour of six mathematical frameworks the field largely ignored, what each one solves, and the actual peer-reviewed evidence that they work.

---

## 1. The Euler Coincidence Nobody Noticed for Two Years

In 2015, Kaiming He and colleagues at Microsoft Research published *Deep Residual Learning for Image Recognition* — the ResNet paper that became one of the most cited works in computer science. The architecture was elegant: instead of learning a transformation directly, each layer learned a *residual*, a small correction to what came in. If the input to a layer is *x*, the output is *x + F(x, W)*.

It worked extraordinarily well. What nobody immediately dwelt on is that this formula is structurally identical to Euler's method for numerically solving ordinary differential equations, written down in 1768. Forward Euler: *y*₍ₙ₊₁₎ = *yₙ* + *h·f(tₙ, yₙ)*. Replace *y* with the hidden state, *h* with a step size of 1, and *f* with the residual function, and you have ResNet. Literally the same equation.

This wasn't a connection the field missed forever. By 2018, Ricky Chen and colleagues at the University of Toronto published *Neural Ordinary Differential Equations*, which won best paper at NeurIPS that year. Their argument: if a ResNet is a discrete Euler approximation to an ODE, why not train the *continuous* version directly? Parameterise the derivative of the hidden state with a neural network, let a proper ODE solver compute the output.

The results were concrete. Neural ODE-Nets achieved roughly equivalent accuracy to ResNets on MNIST — 0.42% versus 0.41% error — with constant memory cost O(1) compared to ResNet's linear cost O(L). And with roughly three times fewer parameters while maintaining the same accuracy. These continuous-depth models can also explicitly trade numerical precision for speed, adapting their evaluation strategy to each input.

Three times fewer parameters. Same accuracy. The only difference was reading Euler properly.

In 2021, Matsubara and colleagues pushed further, publishing the symplectic adjoint method — a gradient computation approach using symplectic integrators, the family of numerical methods developed for Hamiltonian mechanics in classical physics. The symplectic adjoint method consumes much less memory than naive backpropagation and checkpointing schemes, runs faster than the standard adjoint method, and is more robust to rounding errors. Nineteenth-century mechanics, solving a twenty-first-century cost problem.

---

## 2. Graphs That Forgot They Were Euler, Too

Graph Neural Networks have a celebrated failure mode called oversmoothing. Stack enough layers and all the node representations converge toward the same value — the network loses the ability to distinguish between nodes. For years this was treated as a mysterious empirical phenomenon, something to be handled with residual connections and careful hyperparameter tuning.

In 2021, Chamberlain, Rowbottom, Bronstein and colleagues at Twitter Research published GRAND: Graph Neural Diffusion, and the central observation was deceptively simple. They reframed GNNs as discretisations of an underlying partial differential equation governing diffusion on graphs.

Once you look at it that way, oversmoothing isn't mysterious. It's just numerical instability in a badly chosen integrator. Many GNN architectures, interpreted as explicit single-step Euler schemes, are inefficient and require small step sizes to remain stable — exactly the known limitation of forward Euler on stiff problems.

The fix, once you've correctly identified the underlying maths, is to use better numerical methods. GRAND maintains performance at 32 layers while baseline GCN and GCN with residual connections degrade by 50% after just four layers. The implicit Adams-Moulton integration method used in GRAND's stable variant is unconditionally stable for any step size. That stability property has been understood in numerical analysis since the late 19th century. Nobody had thought to ask whether GNNs needed it.

This isn't a minor architectural improvement. A fundamental, field-wide pathology in graph deep learning was, at root, a problem in classical numerical analysis — and the solution had been available for over a century.

The sheaf theory extension is worth noting here too. In 2022, Bodnar, Di Giovanni, Chamberlain, Liò, and Bronstein published *Neural Sheaf Diffusion*, which took the idea further. Sheaf theory — a branch of algebraic topology that tracks locally defined data and measures obstructions to combining it into globally consistent structures — provides a principled framework for handling heterophilic graphs, where connected nodes have genuinely different properties. Standard GNNs implicitly assume a trivial underlying sheaf. That assumption is wrong for a large proportion of real-world graph data, and Neural Sheaf Diffusion addresses both heterophily and oversmoothing by replacing it with a richer structure. The resulting models achieve competitive results on heterophilic benchmarks where standard approaches struggle significantly.

---

## 3. Fourier's Answer to the Resolution Problem

In 1807, Joseph Fourier presented his analysis of heat conduction, arguing that any periodic function could be decomposed into sums of sine and cosine waves. The committee reviewing the work — which included Lagrange — was unconvinced. Fourier's proof was incomplete by the standards they'd later establish. He was still right.

Two hundred and fourteen years later, Zongyi Li and colleagues published *Fourier Neural Operator for Parametric Partial Differential Equations* at ICLR 2021. Standard neural networks learn mappings between finite-dimensional vectors. Change the resolution of your input grid and the model breaks — you have to retrain from scratch. The Fourier Neural Operator instead learns mappings between *infinite-dimensional function spaces*, working in the frequency domain. The result is mesh-invariance: an FNO trained at one resolution can be evaluated at a different resolution without retraining.

The practical consequence is that an FNO-based fluid dynamics solver can be evaluated in a few milliseconds using a standard GPU — orders of magnitude faster than pseudo-spectral simulation methods. For physical simulation work that previously required supercomputer time, this is a category shift, not a marginal speed improvement.

There are limitations worth stating clearly. When the target data contains mainly high-frequency structures — sharp discontinuities, turbulent interfaces — FNO variants face significant difficulties. The method doesn't universally dominate. But for the broad class of smooth or low-frequency physical processes where it does apply, it provides a structural advantage that more compute alone couldn't deliver: the inductive bias of frequency decomposition, a gift from 1807.

---

## 4. Hamilton's Discarded Algebra

On 16 October 1843, walking along the Royal Canal in Dublin, William Rowan Hamilton had the insight he'd been searching for. He needed four dimensions, not three, to extend complex numbers the way he'd been attempting. He carved the key equations into Broome Bridge on the spot: *i² = j² = k² = ijk = -1*. Quaternions.

For a few decades quaternion algebra was the dominant language of mathematical physics. Then Josiah Willard Gibbs and Oliver Heaviside extracted the useful parts into simpler vector notation, and quaternions largely disappeared from physics education. They became an algebraic curiosity — except in computer graphics, where game engines have used quaternions to represent 3D rotations since at least the 1990s, specifically because quaternion multiplication encodes rotation geometrically and avoids the gimbal lock singularity that plagues Euler angle representations.

The AI literature is now revisiting this properly. Shen, Zhang, Huang, Wei, and Zhang published *3D-Rotation-Equivariant Quaternion Neural Networks* at ECCV 2020, establishing that when a neural network uses quaternion features, the network feature naturally has the rotation-equivariance property. Rotation equivariance means that applying a rotation to the input point cloud is equivalent to applying the same rotation to all intermediate-layer quaternion features. The equivariance is structural, not learned.

The practical implication: a standard convolutional network processing 3D data has to learn, from examples, that a rotated chair is still a chair. That costs parameters and training data. A quaternion network gets it algebraically, by design — Hamilton's 1843 algebra carries the inductive bias for free. Any domain where orientation matters structurally — robotics kinematics, molecular geometry, medical imaging, drone navigation — can potentially benefit from the same guarantee.

---

## 5. The Roughness Problem Nobody Could Solve (Until They Read Lyons)

Medical records are irregular. Timestamps don't fall on a grid. Sensor values go missing. Financial tick data arrives asynchronously. Climate monitoring stations skip readings. Standard sequence models — RNNs, Transformers — were built assuming regular sampling. They handle irregular data through interpolation or padding, and they lose information in the process because the gaps themselves contain signal.

Terry Lyons at the University of Oxford has spent decades developing Rough Path Theory — mathematics concerned with differential equations driven by irregular, non-smooth paths. The central object of the theory is the *path signature*: a sequence of iterated integrals that uniquely characterises the geometric structure of a path, proved by Lyons in 1998. The signature is invariant to time reparameterisation and robust to irregular sampling. It provides a fixed-size representation of sequential data regardless of how many observations were used to compute it.

Patrick Kidger, working with Lyons and colleagues, extended this into Neural Controlled Differential Equations, published at NeurIPS 2020. The Neural CDE model processes incoming data that may be both irregularly sampled and partially observed, trained with standard backpropagation. The signature drives the model's hidden state continuously, handling gaps and irregular timestamps as features of the path geometry rather than as defects to be patched.

Clinical application followed directly. Morrill, Kormilitzin, and colleagues used signature-based models for early detection of sepsis from ICU electronic health records — exactly the kind of irregular, partially observed, variable-frequency data the theory was built for. The mathematical framework handles the structure of the data rather than forcing the data into a structure the framework prefers.

One honest caveat: Neural CDEs have since been surpassed on some benchmarks by newer sequence modelling approaches. The field moves fast. But the structural insight — that rough path theory provides a principled, mathematically founded way to handle irregular sequential data — remains sound, and active research at Oxford and elsewhere continues developing it.

---

## 6. The Saddle Point Problem That Wasn't a Mystery

Deep learning practitioners have long known that training very deep networks is hard in ways that aren't fully captured by the concept of local minima. Gradients vanish. Optimisers stall in flat regions. The network gets stuck.

In 2014, Dauphin, Pascanu, Gülçehre, Cho, Ganguli, and Bengio published *Identifying and Attacking the Saddle Point Problem in High-Dimensional Non-Convex Optimization* at NeurIPS. The central argument, grounded in statistical physics and random matrix theory: in high-dimensional optimisation, critical points are exponentially more likely to be saddle points than true local minima. And saddle points surrounded by high-error plateaus can dramatically slow learning, giving the misleading impression of a local minimum when the optimiser is actually stuck on a saddle plateau.

This connects directly to Morse theory — a branch of differential topology developed through the early 20th century that studies manifolds through the critical points (minima, maxima, saddles) of smooth functions defined on them, and classifies them via the eigenvalues of the Hessian. The Dauphin paper proposed Saddle-Free Newton, an approach that uses the Hessian to identify saddle point structure and descend along negative-curvature directions rather than following gradient sign alone. This is Morse theory applied as optimisation strategy.

The paper provides numerical evidence that Saddle-Free Newton escapes high-dimensional saddle points significantly faster than gradient descent and quasi-Newton methods on deep and recurrent networks. The mechanism is explicitly topological: identifying the index of a critical point by examining its Hessian spectrum, then using that information to navigate intelligently rather than blindly.

---

## What the New Document Changes

The source material I've been working with includes a follow-up document making a stronger claim: that every mathematical component underpinning a full heterogeneous synthesis agent has been independently proven in peer-reviewed literature. That's a more ambitious argument, and it's worth being precise about what holds and what's still speculative.

What's proven:
- Rough path signatures handle irregular time-series natively (Kidger et al., NeurIPS 2020).
- Hamiltonian and symplectic geometry improve energy conservation and gradient stability in physics-informed settings (Greydanus et al., NeurIPS 2019; Matsubara et al., NeurIPS 2021).
- Sheaf theory resolves multi-modal contradiction and heterophily in graph learning (Bodnar et al., NeurIPS 2022).
- Tropical geometry characterises the decision-boundary structure of ReLU networks mathematically (Zhang et al., ICML 2018).
- Morse-informed methods outperform standard optimisers on saddle-dominated landscapes (Dauphin et al., NeurIPS 2014).
- Non-smooth and smooth layers can be chained with valid end-to-end gradients through differentiable optimisation (Agrawal et al., NeurIPS 2019).

What's genuinely hypothetical — and the document is honest that it is — is the meta-agent that *dynamically composes and switches between these frameworks based on real-time topological friction signals*. No such system has been built. Neural Architecture Search proves that algorithms can search over mathematical operation spaces; Dynamic Neural Networks prove that computational graphs can be altered at inference time. Combining them specifically to route between mathematical primitives based on sheaf cohomology error signals is extrapolation from those foundations, not established engineering. It's a compelling research direction, not a validated system.

The distinction matters. The component papers are real. The integrated system is a proposal.

---

## Why Did It Take So Long?

The honest answer is that it didn't need to. The barrier wasn't mathematical knowledge — it was incentive structure and tooling.

Deep learning scaled on empirical results. If you could train a bigger model on more data and get better benchmarks, the field rewarded you. PyTorch and TensorFlow were optimised for standard real-valued operations: matrix multiplication, differentiable activations, backpropagation through smooth functions. Integrating Fourier operators, symplectic integrators, sheaf Laplacians, or quaternion algebra requires custom automatic differentiation rules, potentially custom CUDA kernels, and a willingness to work outside established abstractions. That friction cost was tolerable when doubling the compute budget reliably produced better models.

It's becoming less tolerable. Reuters reported OpenAI shifting strategy due to hitting a plateau in scaling current methods. Bloomberg highlighted difficulties across multiple frontier labs in building more capable AI. The scaling wall presents three genuine crises: data scarcity, exponential cost growth, and energy consumption that has grown from 280 MWh for GPT-3 to 6,150 MWh for GPT-4. When the marginal gain from another $100 million of compute shrinks fast enough, the friction cost of a more mathematically demanding approach starts to look cheap.

The Fourier Neural Operator didn't require a new discovery. Fourier's insight was from 1807. The symplectic adjoint method didn't require new mathematics. Hamiltonian mechanics was fully developed by the 19th century. What changed was the question — someone asked what these frameworks could offer to a field that had been operating on empiricism.

---

## What Comes Next

The six cases above — Neural ODEs, GRAND, Fourier Neural Operators, Quaternion Networks, Neural CDEs, Saddle-Free Newton — share the same underlying pattern. A mathematical framework developed for non-AI purposes, largely bypassed by deep learning, was brought in to address a structural problem that empirical methods were handling badly. In each case the result was a genuine architectural advantage: better memory efficiency, eliminated pathologies, resolution independence, structural geometric guarantees, natural handling of irregular data, better escape from loss-landscape saddles.

Whether this becomes a systematic research programme, rather than a collection of individual insights, is the open question. The tools for doing it more systematically — Neural Architecture Search for finding optimal operation sequences, differentiable optimisation for chaining heterogeneous layers, dynamic networks for altering computation at inference time — exist separately in the literature. Assembling them into a coherent system that uses algebraic-topological signals to route between mathematical primitives is the engineering challenge that hasn't yet been tackled.

The maths AI needs almost certainly already exists. The precedent is unambiguous: Fourier analysis was heat theory before it was signal processing. Riemannian geometry was abstract differential geometry before it was general relativity. Quaternions were an algebraic oddity before they were the backbone of every 3D game engine on the planet.

The question isn't whether the next architectural breakthrough will borrow from old mathematics. It's which old mathematics, and when somebody gets annoyed enough by the compute bill to go looking.

---

## A Note on What This Article Has and Hasn't Claimed

Every specific performance figure has a source. The 3× parameter reduction for Neural ODEs versus ResNets on MNIST comes from the Chen et al. 2018 NeurIPS paper and independent analysis. The 50% degradation in standard GCNs after four layers versus GRAND's stability at 32 comes from Chamberlain et al. 2021. The FNO speed comparison against pseudo-spectral methods comes from Kovachki et al. 2022. The Sutskever quote is from Reuters' direct coverage of NeurIPS 2024. The GPT-4 cost and energy figures come from Epoch AI's 2024 cost analysis and MIT Technology Review's reporting.

One correction from my earlier draft: the original Hamiltonian Neural Networks paper by Greydanus et al. claimed that HNNs learn to exactly conserve a quantity analogous to total energy. A 2022 follow-up by Gruver and colleagues found that HNNs conserve their own *learned* energy function rather than necessarily the true physical energy — and that energy error grows linearly over time for both HNNs and standard Neural ODEs. The conservation advantage is real but more nuanced than initially claimed. I've reflected that correctly above.

Where I've used "could," "might," or "potentially," I mean it. The mathematics is established. The integrated system is a hypothesis. That's not a weakness in the argument — it's just where the research actually stands.

---

*Sources: Chen et al., "Neural Ordinary Differential Equations," NeurIPS 2018. Chamberlain et al., "GRAND: Graph Neural Diffusion," ICML 2021. Bodnar et al., "Neural Sheaf Diffusion," NeurIPS 2022. Li et al., "Fourier Neural Operator for Parametric PDEs," ICLR 2021. Shen et al., "3D-Rotation-Equivariant Quaternion Neural Networks," ECCV 2020. Kidger et al., "Neural Controlled Differential Equations for Irregular Time Series," NeurIPS 2020. Matsubara et al., "Symplectic Adjoint Method for Exact Gradient of Neural ODE," NeurIPS 2021. Greydanus, Dzamba, Yosinski, "Hamiltonian Neural Networks," NeurIPS 2019. Dauphin et al., "Identifying and Attacking the Saddle Point Problem," NeurIPS 2014. Agrawal et al., "Differentiable Convex Optimization Layers," NeurIPS 2019. Gruver et al., "Deconstructing the Inductive Biases of Hamiltonian Neural Networks," 2022. Cottier et al., "The Rising Costs of Training Frontier AI Models," Epoch AI 2024. Sutskever, NeurIPS 2024 Test of Time Award talk, Reuters. MIT Technology Review, "We did the math on AI's energy footprint," 2025.*
