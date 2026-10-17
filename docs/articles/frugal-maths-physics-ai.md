# The Frugal Maths: How Ancient Arithmetic and 18th-Century Physics Are Making AI Cheaper

*The first article covered how old mathematics fixed structural problems in deep learning. This one covers something more immediate: maths that addresses the cost. Training is one thing. Running these models on the other seven billion devices on earth is another entirely.*

---

There's a device in your pocket that can take a photo, recognise faces, translate spoken language, and filter spam, all without sending a single byte to a data centre. It does this on a battery the size of a small biscuit, consuming somewhere between a few hundred milliwatts and a couple of watts. The neural networks doing that work are the result of an engineering discipline most people in AI research don't think about very much: the brutal, unglamorous science of making inference cheap enough to run on hardware that can't plug into a wall.

The problem is real and it's sharpening. AI's energy demands are expected to grow from roughly eight terawatt-hours in 2024 to an estimated 652 terawatt-hours by 2030, an over 80-fold increase in six years, according to testimony before the US Senate Energy and Natural Resources Committee in May 2024. The previous article in this series covered how old mathematics fixed structural problems in deep learning — the GNN oversmoothing problem, the memory inefficiency of deep residual networks, the loss-landscape saddle-point problem. This one covers two different mathematical tools aimed at something more immediate: the cost of running models once you've trained them.

Both tools are old. One traces back to the Egyptian Middle Kingdom, roughly 3,000 years ago. The other to Leonhard Euler and Joseph-Louis Lagrange in the 1750s.

Neither was developed with artificial intelligence in mind.

---

## Part One: The Ancients' Arithmetic and the Multiplication Problem

The Rhind Mathematical Papyrus, copied by an Egyptian scribe named Ahmes around 1550 BCE from an older source dating to roughly 1650 BCE, is one of the oldest surviving mathematical documents. Among other things, it contains a table for decomposing fractions into sums of unit fractions — fractions with 1 in the numerator. Three-quarters becomes one-half plus one-quarter. Two-thirds becomes one-half plus one-sixth. The Egyptians worked exclusively in this representation, known today as Egyptian fractions.

The reason they did is contested among historians. Possibly it made physical division of goods easier: split a loaf three ways by first taking half, then a sixth each. Whatever the practical reason, the mathematical structure is clear. Any rational number can be expressed as a finite sum of distinct unit fractions. This was Egyptian arithmetic.

Here's the connection to AI that isn't obvious until someone points it out.

The dominant computational operation in neural network inference is the Multiply-Accumulate operation, or MAC: multiply a weight by an activation, add it to a running total. Repeat billions of times. A hardware multiplier — the silicon circuit that performs this — is among the most expensive components in terms of chip area, energy draw, and heat generation. On a smartphone or IoT sensor, it's a significant portion of the inference power budget. On a dedicated neural network accelerator running at the edge, multipliers are often the limiting resource.

But multiplying by a power of two is not a multiplication. It's a bit shift — moving the binary representation one position left or right. A bit shift requires essentially no energy compared to a hardware multiplier. It's a wire operation, not an arithmetic one.

Egyptian fractions decompose any number into sums of unit fractions. The modern equivalent, adapted for binary hardware, decomposes neural network weights into sums of *powers of two*. A weight of 0.625 becomes 2⁻¹ + 2⁻³ — one right-shift plus another right-shift, then an addition. No multiplier needed.

This is the principle behind **Additive Power-of-Two (APoT) quantisation**, published at ICLR 2020 by Li, Dong, and Wang from the National University of Singapore and Harvard. The paper proposes constraining all quantisation levels to sums of powers-of-two terms, giving roughly 2× multiplication speed-up compared with uniform quantisation, while matching the distribution of weights better than simple power-of-two schemes. The 4-bit quantised ResNet-50 on ImageNet achieved 76.6% top-1 accuracy — competitive with full-precision methods — while reducing computational cost by 22% compared with uniformly quantised counterparts.

The wider research direction was validated separately by Chen et al. in *AdderNet: Do We Really Need Multiplications in Deep Learning?*, published at CVPR 2020. AdderNet replaces convolutional multiplications with L1-distance additions entirely. On MNIST with LeNet-5, AdderNet achieves 99.4% accuracy — the same as a standard CNN — with almost no multiplication operations. On the VIA Nano 2000 CPU, the AdderNet model has approximately 1.7 million cycles of latency against 2.6 million for the equivalent CNN. Fewer multiplications, same answer, substantially less time.

The honest caveat: follow-up work has found that AdderNets are "generally inferior to their multiplication-based counterparts in accuracy" at scale, calling for multiplication-reduced hybrid models rather than pure replacement. The approach works cleanest in constrained settings and on specific architectures. It isn't a universal drop-in replacement for multiplication across all model types. At small scale and on dedicated hardware that treats bit-shifts as first-class operations rather than emulated via floating-point, the advantage is real. As models scale up and move to standard GPU silicon optimised for matrix multiplication, the gap narrows.

The underlying principle is still sound. Egyptian fraction decomposition tells you that any weight can be expressed as a sum of bit-shifts — operations that cost almost nothing on hardware. The engineering question is how far that principle can be pushed before the approximation error in the weights overwhelms the energy savings. The answer, in 2025, is: further than you'd expect, and further than it was in 2020.

---

## Part Two: Lagrange's Equations and the Data Famine

The second mathematical framework in this article is older than Egyptian fractions are old — not as a cultural artifact but as a scientific concept, which has a different kind of longevity.

In the 1750s, working from results by Euler, Joseph-Louis Lagrange developed what is now called the Euler-Lagrange equation — the centrepiece of the calculus of variations. The question it answers: given a functional (a function that takes a function as its input and returns a number), what function minimises or extremises it? The classic example is the brachistochrone problem: what shape should a frictionless ramp take so that a bead slides between two points in minimum time? The answer isn't a straight line. It's a cycloid. The Euler-Lagrange equation tells you why.

More physically: in Lagrangian mechanics, the motion of any system follows the path of least *action* — the integral of the difference between kinetic and potential energy over time. The Euler-Lagrange equation defines what that path looks like. Newton's second law, conservation of momentum, conservation of energy: all of these fall out of it as special cases. It is, in a real sense, the deepest description of how physical systems move through time.

What it has to do with neural networks is this.

Standard deep learning is data-hungry in a way that has become genuinely problematic. A model learning to simulate fluid flow from data needs to see enormous numbers of timesteps across enormous numbers of configurations before it can generalise. The reason is that the model has no prior knowledge. A black-box network given input-output pairs of fluid simulations has no idea that mass must be conserved, that momentum doesn't vanish, that certain solutions are physically impossible. It will cheerfully learn a mapping that violates conservation of mass if the training data distribution is narrow enough not to reveal the inconsistency.

**Physics-Informed Neural Networks (PINNs)**, formalised by Raissi, Perdikaris, and Karniadakis in the *Journal of Computational Physics* in 2019, address this directly. The key idea is embedding the relevant PDE — the governing equation of the physical system, often derivable from the Euler-Lagrange equation — directly into the loss function. The network isn't just penalised for being wrong about the data. It's penalised for violating physics.

Formally: the loss becomes the sum of a data-fit term and a physics-residual term. The physics-residual term is the squared error of the network's output when substituted into the governing PDE — the extent to which the predicted solution fails to satisfy the equation. If the model predicts a flow field that doesn't satisfy the Navier-Stokes equations, the physics residual is nonzero, and the network is penalised accordingly.

The data efficiency this enables is substantial in the settings where PINNs work well. Raissi et al.'s 2019 paper demonstrated solving forward and inverse problems in nonlinear PDEs using only small numbers of scattered observation points — the physics constraint does the regularisation work that would otherwise require an enormous data set. One 2025 study on wave equation problems found that parameter estimation errors remain below 3% using only five spatially distributed sensors, and below 5% error using a single sensor at a known location. That's data efficiency in the most literal sense: a handful of measurements, plus the known equations of physics, producing accurate reconstruction of a complex dynamic system.

The mechanism is exactly what the Euler-Lagrange formalism provides. When you know the action functional of a system — the quantity whose minimisation defines the physical trajectory — you know the governing equation. Embed that in the loss function, and the network's solution space is constrained to the manifold of physically admissible answers before it's ever shown a data point. The mathematics from the 1750s acts as a prior, sharply reducing how much data you need to learn the rest.

The limitations are equally important to state clearly. PINNs have well-documented training difficulties: the physics loss and the data loss can have vastly different gradient magnitudes, leading to pathological training dynamics. For strongly nonlinear systems or high-dimensional PDEs, training becomes slow and can fail to converge. Substantial current research addresses exactly these failure modes — adaptive weighting schemes, domain decomposition, better optimisers for the physics-residual loss. PINNs are not a solved technology. They're an active research area with real results and real limitations in roughly equal measure.

What's not in question is the conceptual contribution. Lagrange's formalism, written in the 1750s to describe the motion of mechanical systems, turns out to define the correct mathematical structure for regularising a neural network with physical knowledge. The loss function is a functional. Minimising it under a physics constraint is exactly the problem the calculus of variations was invented to solve.

---

## The Pattern These Two Cases Share

Egyptian fractions and the Euler-Lagrange equation are about as different as two mathematical tools can be. One is elementary arithmetic, ancient enough to predate written language in most parts of the world. The other is sophisticated 18th-century variational calculus that took three centuries of mathematical development to make rigorous.

But they address the same structural situation: a field with an enormous resource problem — energy consumption for edge inference; training data scarcity for physical simulation — where the mathematics of the solution already existed, and nobody in the field was looking at it.

The pattern across both articles in this series is the same. Deep learning built its competitive position on empirical scaling: more data, more compute, more parameters. When the marginal return on each of those drops — when the compute bill for a single training run exceeds $100 million, when the internet's high-quality text is approaching exhaustion, when deploying inference to seven billion edge devices requires running on a battery — the field is forced to think structurally rather than empirically. And structural thinking tends to lead back to mathematics that was developed, in different contexts, for exactly the same structural problems.

The question isn't philosophical. It's practical. The next IoT microcontroller that runs a neural network for anomaly detection in an industrial sensor — running on a coin cell for three years, no data connection, no hardware multiplier — will probably use something closer to Egyptian fraction weight decomposition than to the standard training pipeline at the frontier labs. And the next surrogate model used to replace a million-element fluid dynamics simulation in an engineering design loop will probably have a physics-informed loss function derived, ultimately, from Lagrange's 1750s variational principle.

Neither of those engineers will necessarily know that. Which is fine. The maths doesn't care whether you know its history. It just works.

---

## A Note on What's Claimed Here and What Isn't

The APoT quantisation results — 76.6% top-1 accuracy on ImageNet with 4-bit ResNet-50 and 22% computational cost reduction — come from Li, Dong, and Wang, ICLR 2020. The AdderNet accuracy results on MNIST and CIFAR-10 come from Chen et al., CVPR 2020. The limitation that AdderNets are "generally inferior to their multiplication-based counterparts in accuracy" at scale comes from independent follow-up work surveying the field.

The PINN data-efficiency results — parameter estimation below 3% error with five sensors, below 5% with one — come from a 2025 study on wave equation inverse problems. The formalism is from Raissi, Perdikaris, and Karniadakis, *Journal of Computational Physics* 378 (2019). The framing that the physics residual acts as a regulariser enabling small-data learning comes directly from Raissi et al.'s original paper: encoding prior physical knowledge "results in amplifying the information content of the data that the algorithm sees, enabling it to quickly steer itself towards the right solution and generalize well even when only a handful of training data are available."

Where quantitative claims appear without a citation, treat them as hypothesis. The structural argument — that both frameworks address specific resource constraints with pre-existing mathematical tools — I'd stand behind. The specific numbers I've cited are from named papers. The unnamed numbers, if any slipped through, should be treated with appropriate scepticism.

---

*Sources: Li, Dong, Wang, "Additive Powers-of-Two Quantization: An Efficient Non-Uniform Discretization for Neural Networks," ICLR 2020. Chen et al., "AdderNet: Do We Really Need Multiplications in Deep Learning?", CVPR 2020. Raissi, Perdikaris, Karniadakis, "Physics-Informed Neural Networks: A Deep Learning Framework for Solving Forward and Inverse Problems Involving Nonlinear Partial Differential Equations," Journal of Computational Physics 378, 2019. Senate Energy and Natural Resources Committee testimony on AI energy demand, May 2024, cited in Extreme Networks reporting. Follow-up accuracy limitation note from ResearchGate review of AdderNet literature.*

---

## Part Three: The Number That Binary Forgot

Here's a fact about binary arithmetic that tends to get buried in engineering curricula: it's not actually the most mathematically efficient way to represent numbers.

The most efficient integer base — the one that minimises the product of the number of digits needed and the number of states per digit — is base *e*, roughly 2.718. Since you can't build a computer with an irrational number of states per digit, the nearest integer is three. Ternary — base three — is, by this metric, the most computationally efficient discrete number system that exists.

Donald Knuth, writing in *The Art of Computer Programming*, called balanced ternary "perhaps the most beautiful number system of all." He wasn't being whimsical. Balanced ternary uses the digits {-1, 0, 1} rather than {0, 1, 2}. It handles negative numbers natively, without a sign bit or two's complement encoding. Every integer has a unique representation. The arithmetic is clean.

In 1958, Nikolay Brusentsov and Sergei Sobolev at Moscow State University built a working computer on this basis. They called it Setun, after a river near the university. About fifty machines were produced between 1959 and 1965. The Russian Virtual Computer Museum's account of the official testing in April 1960 records that Setun "demonstrated unusual for those times reliability and stability of operation in wide range of ambient temperature and supply voltage." This wasn't incidental. The Setun used magnetic amplifiers built from ferrite cores rather than the fragile vacuum tubes and early transistors that plagued binary machines of the era. Ferrite-core logic was physically robust — tolerant of voltage fluctuations, temperature swings, and the general abuse of institutional computing environments. The binary computers of the same period were notoriously temperamental; the Setun, by comparison, simply kept running.

Soviet programmers running complex physics simulations reported something more than hardware reliability. Their numerical outputs were unusually stable over long calculations — results didn't drift the way they did on binary machines. The likely explanation, though it wasn't articulated this way at the time, is mathematical: balanced ternary is perfectly symmetrical around zero. When rounding errors occur in sequential arithmetic, positive and negative errors tend to cancel each other out across many operations rather than accumulating in one direction. Programmers interpreted this numerical stability as the machine "never failing." What they were probably observing was the arithmetic behaving better, not the hardware being perfect.

For sixty years, balanced ternary was a historical curiosity, an elegant detour the industry hadn't taken. Now it's back, and the reason is exactly the problem Egyptian fractions were meant to address: hardware multipliers are expensive, and somebody decided to ask what happens if you eliminate them entirely.

---

### The Trit That Turns Off the Multiplier

The connection to neural networks is direct and concrete.

When you restrict the weights of a neural network to the set {-1, 0, 1} — one trit per weight, in balanced ternary — something happens to the multiply-accumulate operation at the heart of inference. If the weight W is zero, the result is zero: skip the computation entirely. If W is 1, the result is the activation X: pass it through unchanged, no arithmetic at all. If W is -1, the result is -X: flip the sign bit. That's a wire operation.

There is no multiplication. The hardware multiplier — the energy-hungry, area-consuming circuit that dominates edge AI power budgets — simply isn't needed. The "multiply" step becomes a conditional: is the weight zero, positive, or negative? Route accordingly.

The mathematical confirmation came in 2016. Li, Zhang, and Liu at the Chinese Academy of Sciences published *Ternary Weight Networks*, which introduced TWNs and showed they achieve up to 16× or 32× model compression rate while needing fewer multiplications than full-precision counterparts. On MNIST and CIFAR-10 the classification performance was very close to full precision networks. On ImageNet the ternary weight networks outperformed binary weight networks by about 4% top-1 accuracy, with only a 3.6% gap remaining compared to full precision on ResNet-18.

The same year, Zhu, Han, Mao, and Dally at Stanford published *Trained Ternary Quantization*, which took the method further by learning the ternary assignments and scaling factors during training. Their TTQ AlexNet model on ImageNet actually outperforms full-precision AlexNet by 0.3% top-1 accuracy. On CIFAR-10, ternary ResNets of 32, 44, and 56 layers outperformed their full-precision equivalents by 0.04%, 0.16%, and 0.36% respectively. The models are nearly 16× smaller than full-precision.

More recent work confirms this holds at scale. A 2024–2025 study on 1.58-bit quantisation (the average bits per weight in a balanced ternary scheme) found that networks averaging 1.58 bits per channel recover 97–99% of full-precision accuracy. One recent study on ImageNet CNNs using ternary pointwise convolutions reported energy consumption reduced by more than an order of magnitude while maintaining the task performance of the full-precision model.

This is the Goldilocks point the source document identifies correctly. Binary networks — weights restricted to {-1, 1} — lose roughly 10–20% accuracy on challenging tasks like ImageNet compared to full precision. That's often too much. Ternary networks recover almost all of it, because the zero state allows the network to represent "this connection doesn't fire for this input" — dynamic, input-dependent sparsity that binary can't express.

The 1–3% accuracy gap that remains under ternary has a specific, non-obvious cause. It concentrates almost entirely in the first and last layers, which is why virtually every practical TWN deployment keeps those two layers at higher precision. The first convolutional layer ingests raw pixel values — continuous gradients, subtle edge information, large dynamic range. Forcing those initial filters to {-1, 0, 1} destroys fine signal structure before the network has built any hierarchical representation of it. The last layer, in a thousand-class problem like ImageNet, must separate highly similar high-dimensional feature vectors — a Maine Coon from a Norwegian Forest Cat, say. Ternary weights simply don't have the numerical resolution to draw the sharp decision boundaries that task requires. Keep those two layers at 8-bit or FP16 and the bulk of the gap disappears. This is now standard practice in deployed ternary models.

---

### Where the Hardware Actually Lives

The software story is largely settled. The hardware story is more complicated and more interesting.

Standard CMOS transistors are binary devices. They're either conducting or not. Building ternary logic in CMOS requires complex voltage-sensing circuits that can reliably distinguish three states — and reliably turns out to be the operative word. The source document is correct that naive ternary CMOS can consume more power than the multipliers it's replacing. Standard transistor fabrication doesn't make it easy.

The real action is in resistive memory. Resistive RAM — ReRAM, also called memristive memory — stores information as the resistance state of a thin material film. Apply a voltage pulse and the resistance changes; measure the resistance and you read the stored value. Unlike CMOS transistors, ReRAM cells can occupy multiple resistance states continuously. A multi-level ReRAM cell can be programmed to three distinct resistance levels, mapping directly to {-1, 0, 1} without the circuit complexity that CMOS ternary requires.

The deeper advantage is what happens when you arrange these cells in a crossbar array. Each row carries an input voltage; each column collects an output current. Because current through a resistor obeys Ohm's Law, the current at each column is the sum of input voltages multiplied by the conductance (inverse resistance) of each cell in that column. That's a dot product. The matrix multiplication happens in the physics of the array as the voltages propagate — no data needs to move from memory to processor. The von Neumann bottleneck, the energy cost of shuttling data between RAM and compute, disappears.

Prior ReRAM-based accelerators have demonstrated two orders of magnitude advantages in energy, performance, and chip footprint over their digital counterparts. That's the number to hold in mind: not 10×, not 50× — potentially 100×, according to results from real hardware implementations, not simulations.

The TWN connection makes this cleaner. Ternary weights map to three resistance states. When the weight is zero, the resistance is set to a high-impedance state that contributes effectively nothing to the column current — the dynamic sparsity that TWNs provide in the weight domain translates directly into a near-zero energy contribution in the physical array.

---

### The Three Caveats You Actually Need to Know

The source document is right that hardware engineers will dismiss any piece on ternary in-memory computing that doesn't name the failure modes. There are three, and they're genuine.

**The sensing margin problem.** Distinguishing two resistance states — high versus low — is straightforward. Distinguishing three is harder. As ReRAM devices age, as temperature fluctuates, as cycling causes device degradation, the "medium" resistance state can drift toward either the high or low state. The boundary between states blurs. A trit that should read as 0 flips to -1 or 1. In an AI model, that's a weight error that degrades accuracy gradually and unpredictably. This is an active area of materials research; it isn't solved.

**The ADC tax.** The in-memory computation produces an analog current. To use that result in the rest of the digital system, you need an analog-to-digital converter. ADCs are not cheap. In current ReRAM-based CIM designs, the ADC circuitry accounts for more than 60% of power consumption and more than 30% of chip area. The computation inside the crossbar is extraordinary efficient; getting the result out is not. Much of the research on ReRAM accelerators is, in practice, research on how to make the peripheral ADC circuitry less dominant. The energy advantage of the crossbar array is frequently eaten by the ADC it requires.

**The straight-through estimator problem.** During training, you need gradients to flow through the weight quantisation step. But {-1, 0, 1} is discrete — it has no derivative in the usual sense. The standard workaround is the Straight-Through Estimator: during the backward pass, pretend the weights are continuous; during the forward pass, snap them to ternary. This creates a gap between what the model trains on and what it runs on. Training ternary networks is noticeably more finicky than training in full precision — the TTQ paper notes the training requires careful initialisation and is sensitive to hyperparameters in ways standard training isn't. This isn't unsolvable, but it's not trivial either.

---

### The Narrative These Three Parts Share

Start with the Rhind Papyrus: ancient arithmetic optimised for a lack of hardware multipliers. Move to APoT: modern arithmetic doing the same thing in silicon, decomposing weights into bit-shifts. Move to PINNs: Euler-Lagrange equations from the 1750s, reducing data hunger by encoding physical law. Then arrive here: a Soviet computer from 1958, running on balanced ternary in a small room in Moscow, solving the multiplier problem with a number system that predates transistors.

The thread isn't nostalgia. It's the observation that resource constraints are not new problems, and the maths developed to address resource constraints in earlier contexts tends to be precisely what you need when those constraints reappear. Binary dominated AI hardware because binary dominated computing, because the market locked in before ternary silicon was viable. Now, when the energy cost of running inference on edge devices is a genuine engineering problem, the mathematical argument for ternary that Brusentsov made in 1958 looks less like an elegant detour and more like a road that was always there.

Fifty machines. Fifteen years of operation. Unusual reliability in wide ambient conditions — and then cancelled because the rest of the industry had already committed to something else.

The rest of the industry is now, slowly, reconsidering.

---

## Revised Source Notes

*Sources for the ternary section: Li, Zhang, Liu, "Ternary Weight Networks," NIPS Workshop on EMDNN 2016. Zhu, Han, Mao, Dally, "Trained Ternary Quantization," ICLR 2017. Martínez et al., "PROM: Prioritize Reduction of Multiplications Over Lower Bit-Widths for Efficient CNNs," 2025 (order-of-magnitude energy reduction on ImageNet). Emergent Mind survey on 1.58-bit quantisation, citing Yang et al. 2024 (97–99% accuracy recovery). ReRAM ADC overhead: "Exploring Bit-Slice Sparsity in Deep Neural Networks for Efficient ReRAM-Based Deployment," IEEE 2019 (>60% power, >30% area from ADCs). Two orders of magnitude efficiency claim: prior ReRAM accelerator literature cited in "Update Disturbance-Resilient Analog ReRAM Crossbar Arrays," Advanced Science 2025. Setun history: Wikipedia articles on Setun and Nikolay Brusentsov, sourced from Trogemann, Nitussov, Ernst, "Computing in Russia," Vieweg+Teubner 2001. Donald Knuth balanced ternary quotation: The Art of Computer Programming, Vol. 2. Setun ferrite element performance note from DEV Community historical article citing Brusentsov's own account.*
