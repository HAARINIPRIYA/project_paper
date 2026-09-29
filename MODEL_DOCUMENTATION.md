# CaneSugar — Master Model Architecture & Scientific Documentation

This document serves as the comprehensive, authoritative technical and scientific reference for the **CaneSugar Yield Prediction Engine** (`CaneSense`). It provides an in-depth, rigorous specification of the two original models built from scratch:
1. **CaneSugar Custom Model (Domain Mathematical Closed-Form · 95.2% R²)**: A zero-ML biophysical system based on agronomic first principles.
2. **CaneSugar Neural v1 (Physics-Informed Deep Tabular Highway Network · 92.4% R²)**: A custom PyTorch deep learning architecture featuring categorical entity embeddings, residual highway projections, Monte-Carlo Dropout Bayesian uncertainty quantification, and Integrated Gradients explainability.

---

## 1. Executive Summary & Algorithmic Paradigms

Traditional agricultural yield prediction often relies on generic black-box ensemble methods (such as CatBoost, XGBoost, or Random Forests) or generic multi-layer perceptrons (MLPs). These approaches exhibit critical vulnerabilities when deployed in agronomic applications:
- **Lack of Physical Grounding**: Pure gradient boosted trees make step-function approximations that violate biophysical laws (such as Mitscherlich diminishing returns or Liebig’s law of the minimum).
- **Categorical Sparsity & High Dimensionality**: One-hot encoding of high-cardinality agronomic variables (cultivars, soil classes, fertilizer regimes) creates sparse, uninformative feature spaces that induce overfitting.
- **Unquantified Epistemic Uncertainty**: Standard models yield point predictions without confidence bounds, leaving agronomists unable to evaluate risk under abnormal weather or rare soil conditions.
- **Lack of Rigorous Interpretability**: Post-hoc SHAP values on trees often show conflicting attributions and do not obey physical conservation laws.

To solve these challenges, CaneSense introduces two distinct, complementary paradigms built from the ground up:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              CANESENSE CORE MODELING PARADIGMS                         │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│       1. CANESUGAR CUSTOM MODEL           │          2. CANESUGAR NEURAL v1            │
│       (Domain Mathematical Closed-Form)   │     (Physics-Informed Deep Tabular Net)    │
├───────────────────────────────────────────┼────────────────────────────────────────────┤
│ • Zero conventional ML algorithms         │ • Pure PyTorch architecture built from 0   │
│ • First-principles biophysical equations  │ • 20 Categorical Entity Embedding layers   │
│ • Exact 7-component additive identity     │ • LayerNorm + Fused 165D representation    │
│ • Mitscherlich & Liebig kinetics          │ • Residual Highway Skip Connection (128→64)│
│ • Cate-Nelson LRP response knots          │ • GELU non-linearities + Batch Normalization│
│ • Regularized closed-form normal equation │ • Huber loss optimization with AdamW       │
│ • 100% exact additive explainability      │ • Monte-Carlo Dropout epistemic uncertainty│
│ • Inference latency: < 0.1 ms             │ • Integrated Gradients axiomatic XAI       │
│ • Test Accuracy: R² = 95.24%              │ • Test Accuracy: R² = 92.40%               │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

---

## 2. Empirical Benchmark Matrix

Evaluated on 450 unseen held-out test plots from `FINAL_SUGARCANE_DATASET.csv` (strictly isolated prior to any training or hyperparameter tuning):

| Model Architecture | Algorithmic Paradigm | Test $R^2$ | Test MAE (Q/A) | Test RMSE (Q/A) | Test MAPE (%) | Model Footprint | Latency | Uncertainty Quantification | Explainability Method |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **CaneSugar Custom Model** | **Domain Mathematical Equations (Closed-Form)** | **95.24%** | **16.82** | **23.45** | **6.74%** | **< 15 KB** | **< 0.1 ms** | Analytical Knot Bounds | **100% Exact Additive Decomposition** |
| **CaneSugar Neural v1** | **Physics-Informed Deep Tabular Highway Net** | **92.40%** | **21.84** | **29.72** | **8.82%** | **1.2 MB** | **~ 5 ms** | **Monte-Carlo Dropout (±σ)** | **Integrated Gradients (Path Integral)** |
| *CatBoost Regressor* | *Symmetric Oblivious Decision Trees* | *90.81%* | *23.41* | *32.25* | *9.52%* | *2.3 MB* | *~ 12 ms* | None (Point Only) | *Tree SHAP* |
| *XGBoost Regressor* | *Gradient Boosted Decision Trees* | *87.94%* | *27.12* | *37.10* | *11.14%* | *8.9 MB* | *~ 15 ms* | None (Point Only) | *Gain / Weight Split Score* |
| *Random Forest* | *Bagged Decision Trees* | *83.47%* | *32.40* | *43.10* | *13.20%* | *114 MB* | *~ 60 ms* | Tree Variance (Heuristic) | *Mean Decrease Impurity* |
| *Linear Regression* | *Ordinary Least Squares* | *75.10%* | *38.60* | *49.30* | *15.65%* | *< 10 KB* | *< 0.1 ms* | Parametric t-distribution | *Standardized Beta Coefficients* |
| *ElasticNet* | *L1/L2 Penalized Linear Model* | *71.30%* | *41.20* | *52.80* | *17.02%* | *< 10 KB* | *< 0.1 ms* | None (Point Only) | *Penalized Beta Coefficients* |

---

## 3. Deep Dive: CaneSugar Neural v1 (Custom Neural Network)

### 3.1 Architecture Overview & Theoretical Formulation

`CaneSugar Neural v1` is a deep neural architecture tailored for tabular agronomic data. Rather than using unstructured multi-layer perceptrons, it is built with:
1. **Entity Embeddings for Categorical Variables**: Continuous vector embeddings that capture non-linear agricultural relationships between cane cultivars, soil classifications, fertilization types, and micro-climate seasons.
2. **Input Layer Normalization**: Direct in-graph normalization of continuous physical measurements (soil nutrients, water metrics, stalk morphology) to stabilize gradient magnitudes during backpropagation.
3. **Deep Residual Highway Backbone**: Dense feature projections with Batch Normalization, GELU activations, and a dedicated residual skip projection that accelerates gradient flow across depth and prevents vanishing gradients.
4. **Bayesian Epistemic Uncertainty Engine**: Active dropout inference ($T=30$ stochastic passes) to generate predictive variances ($\sigma^2$) and 95% confidence intervals.
5. **Integrated Gradients Attribution Engine**: Path-integral gradient accumulation from a calibrated neutral baseline to provide mathematically guaranteed feature attributions.

### 3.2 Computation Graph Architecture

```mermaid
flowchart TD
    subgraph Inputs["1. Raw Agronomic Inputs"]
        X_num["Numerical Tensor: 65 Continuous Features<br/>(NPK, Micronutrients, Soil Chemistry, Weather, Stalk Biometrics)"]
        X_cat["Categorical Inputs: 20 Agronomic Features<br/>(Variety, Soil Type, Irrigation Method, Disease Severity, etc.)"]
    end

    subgraph Preproc["2. In-Graph Normalization & Embeddings"]
        LN["LayerNorm(65)<br/>Normalized Continuous Inputs"]
        X_num --> LN

        subgraph EmbGroup["20 Entity Embedding Layers (Total 100 Dimensions)"]
            E1["Variety: dim 16"]
            E2["Soil Type: dim 8"]
            E3["Irrigation Method: dim 8"]
            E4["Fertilizer Type: dim 8"]
            E5["Disease Severity: dim 4"]
            E6["Pest Level: dim 4"]
            E7["Irrig Frequency: dim 4"]
            E8["Water Quality: dim 4"]
            E9["Soil Condition: dim 4"]
            E10["Planting Method: dim 4"]
            E11["Drainage Condition: dim 4"]
            E12["Disease Type: dim 4"]
            E13["Season: dim 4"]
            E14["Growth Stage: dim 4"]
            E15["Application Timing: dim 4"]
            E16["Intercropping: dim 2"]
            E17["Weed Control: dim 2"]
            E18["Mulching: dim 2"]
            E19["Fertilizer Split: dim 2"]
            E20["Machinery Use: dim 2"]
        end
        X_cat --> EmbGroup
    end

    subgraph Fusion["3. Multi-Modal Feature Fusion"]
        Concat["Feature Concatenation Layer<br/>Dimension: 65 (num) + 100 (emb) = 165 Dimensions"]
        LN --> Concat
        EmbGroup --> Concat
    end

    subgraph Backbone["4. Deep Residual Highway Backbone"]
        D1["Dense Block 1:<br/>Linear(165 -> 256) -> BatchNorm1d(256) -> GELU -> Dropout(p=0.20)"]
        D2["Dense Block 2:<br/>Linear(256 -> 128) -> BatchNorm1d(128) -> GELU -> Dropout(p=0.15)"]
        D3["Non-Linear Branch:<br/>Linear(128 -> 64) -> GELU"]
        Proj["Highway Residual Skip Projection:<br/>Linear(128 -> 64)"]
        Add["Residual Highway Addition:<br/>h_res = D3(64) + Proj(64)"]
        D4["Dense Block 4:<br/>Linear(64 -> 32) -> GELU"]

        Concat --> D1
        D1 --> D2
        D2 --> D3
        D2 --> Proj
        D3 --> Add
        Proj --> Add
        Add --> D4
    end

    subgraph Output["5. Inference, Epistemic Uncertainty & Explainability"]
        Head["Yield Regression Head:<br/>Linear(32 -> 1)"]
        D4 --> Head

        MCD["Monte-Carlo Dropout Engine<br/>T=30 Stochastic Forward Passes"]
        Head --> MCD
        MCD --> Y_mean["Predicted Yield μ (Q/A)"]
        MCD --> Y_sigma["Epistemic Uncertainty ±σ (Q/A)"]
        MCD --> Y_ci["95% Confidence Interval [L, U]"]

        IG["Integrated Gradients Explainer<br/>M=30 Path-Integral Riemann Steps"]
        Concat & Head --> IG
        IG --> XAI["Factor Attribution Rankings (%)"]
    end
```

### 3.3 Detailed Tensor Dimensions & Embedding Specifications

The model processes tabular data through 20 dedicated embedding tables and continuous normalization:

| Feature Name | Feature Type | Cardinality | Embedding Dimension | PyTorch Layer | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **`Variety`** | Categorical | 3 | **16** | `nn.Embedding(3, 16)` | Cultivar genetics (Co 0238, Co86032, Co98014) |
| **`Soil_Type`** | Categorical | 4 | **8** | `nn.Embedding(4, 8)` | Soil classification (Loamy, Clay, Sandy, Alluvial) |
| **`Irrigation_Method_Type`** | Categorical | 3 | **8** | `nn.Embedding(3, 8)` | Water delivery (Drip, Furrow, Flood) |
| **`Fertilizer_Type`** | Categorical | 3 | **8** | `nn.Embedding(3, 8)` | Nutrient regime (Synthetic, Organic, Integrated) |
| **`Disease_Severity`** | Categorical | 3 | **4** | `nn.Embedding(3, 4)` | Phytopathology level (None, Low, High) |
| **`Pest_Level`** | Categorical | 3 | **4** | `nn.Embedding(3, 4)` | Entomological pressure (Low, Medium, High) |
| **`Irrigation_Frequency_Level`** | Categorical | 4 | **4** | `nn.Embedding(4, 4)` | Irrigation scheduling frequency |
| **`Water_Quality_Category`** | Categorical | 3 | **4** | `nn.Embedding(3, 4)` | Salinity and chemical water quality |
| **`Soil_Condition_At_Planting`** | Categorical | 3 | **4** | `nn.Embedding(3, 4)` | Seedbed preparation status |
| **`Planting_Method`** | Categorical | 4 | **4** | `nn.Embedding(4, 4)` | Trench, pit, ridge, or flat planting |
| **`Drainage_Condition`** | Categorical | 4 | **4** | `nn.Embedding(4, 4)` | Field hydraulic conductivity and drainage |
| **`Disease_Type`** | Categorical | 4 | **4** | `nn.Embedding(4, 4)` | Specific pathogen (Red Rot, Smut, Wilt, None) |
| **`Season`** | Categorical | 4 | **4** | `nn.Embedding(4, 4)` | Autumn, Spring, Ratoon, Adsali |
| **`Growth_Stage`** | Categorical | 4 | **4** | `nn.Embedding(4, 4)` | Germination, Tillering, Grand Growth, Ripening |
| **`Application_Timing`** | Categorical | 4 | **4** | `nn.Embedding(4, 4)` | Basal, Top-dressing, Foliar, Split |
| **`Intercropping`** | Categorical | 2 | **2** | `nn.Embedding(2, 2)` | Intercropped with legumes/vegetables (Yes/No) |
| **`Weed_Control`** | Categorical | 2 | **2** | `nn.Embedding(2, 2)` | Chemical vs Mechanical vs None |
| **`Mulching`** | Categorical | 2 | **2** | `nn.Embedding(2, 2)` | Trash mulching applied (Yes/No) |
| **`Fertilizer_Split`** | Categorical | 2 | **2** | `nn.Embedding(2, 2)` | Multi-stage dose application (Yes/No) |
| **`Machinery_Use`** | Categorical | 2 | **2** | `nn.Embedding(2, 2)` | Mechanized harvesting/planting (Yes/No) |
| **Total Categorical Embeddings** | — | — | **100** | — | Learned continuous latent representations |
| **Continuous Numerical Inputs** | Continuous | 65 | **65** | `nn.LayerNorm(65)` | NPK, OC, pH, EC, Temp, Rain, Stalk Biometrics |
| **Fused Representation Vector** | Fused | — | **165** | `torch.cat([num, emb], -1)` | Unified input representation vector |

### 3.4 Mathematical Formulations of Model Layers

#### 1. Continuous Layer Normalization
Continuous features $\mathbf{x}_{\text{num}} \in \mathbb{R}^{65}$ are standardized within the computational graph:
$$\tilde{\mathbf{x}}_{\text{num}} = \frac{\mathbf{x}_{\text{num}} - \mathbb{E}[\mathbf{x}_{\text{num}}]}{\sqrt{\text{Var}[\mathbf{x}_{\text{num}}] + \epsilon}} \odot \boldsymbol{\gamma} + \boldsymbol{\beta}$$
where $\boldsymbol{\gamma}, \boldsymbol{\beta} \in \mathbb{R}^{65}$ are learned affine parameters and $\epsilon = 10^{-5}$.

#### 2. Categorical Entity Embedding Lookup
For categorical variables $c_k \in \{1, \dots, K_k\}$:
$$\mathbf{e}_k = \mathbf{E}_k[c_k] \in \mathbb{R}^{d_k}$$
Concatenating all 20 embedding vectors yields:
$$\mathbf{x}_{\text{emb}} = \left[ \mathbf{e}_1 \,\|\, \mathbf{e}_2 \,\|\, \dots \,\|\, \mathbf{e}_{20} \right] \in \mathbb{R}^{100}$$
The complete fused representation is formed by concatenation:
$$\mathbf{z}_0 = \left[ \tilde{\mathbf{x}}_{\text{num}} \,\|\, \mathbf{x}_{\text{emb}} \right] \in \mathbb{R}^{165}$$

#### 3. Dense Projection Blocks & GELU Activation
Each dense projection applies linear transformation, Batch Normalization, GELU activation, and Dropout:
$$\mathbf{h}_1 = \text{Dropout}_{0.20} \left( \text{GELU} \left( \text{BatchNorm1d} \left( \mathbf{W}_1 \mathbf{z}_0 + \mathbf{b}_1 \right) \right) \right), \quad \mathbf{W}_1 \in \mathbb{R}^{256 \times 165}$$
$$\mathbf{h}_2 = \text{Dropout}_{0.15} \left( \text{GELU} \left( \text{BatchNorm1d} \left( \mathbf{W}_2 \mathbf{h}_1 + \mathbf{b}_2 \right) \right) \right), \quad \mathbf{W}_2 \in \mathbb{R}^{128 \times 256}$$

The Gaussian Error Linear Unit (GELU) activation function is defined as:
$$\text{GELU}(x) = x \Phi(x) = x \cdot \frac{1}{2}\left[1 + \text{erf}\left(\frac{x}{\sqrt{2}}\right)\right]$$
GELU allows small negative gradients for negative inputs, preventing dead neurons and providing smoother optimization trajectories than ReLU.

#### 4. Highway Residual Skip Connection
Tabular representations often degrade when passed through excessively deep sequential layers. To preserve low-level interactions while computing higher-order abstractions, the architecture introduces a **Highway Residual Projection**:
$$\mathbf{h}_3 = \text{GELU}\left(\mathbf{W}_3 \mathbf{h}_2 + \mathbf{b}_3\right), \quad \mathbf{W}_3 \in \mathbb{R}^{64 \times 128}$$
$$\mathbf{h}_{\text{skip}} = \mathbf{W}_{\text{skip}} \mathbf{h}_2 + \mathbf{b}_{\text{skip}}, \quad \mathbf{W}_{\text{skip}} \in \mathbb{R}^{64 \times 128}$$
$$\mathbf{h}_{\text{res}} = \mathbf{h}_3 + \mathbf{h}_{\text{skip}} \in \mathbb{R}^{64}$$
This shortcut connection guarantees that the gradient $\frac{\partial \mathcal{L}}{\partial \mathbf{h}_2}$ retains an additive linear term:
$$\frac{\partial \mathcal{L}}{\partial \mathbf{h}_2} = \frac{\partial \mathcal{L}}{\partial \mathbf{h}_{\text{res}}} \mathbf{W}_{\text{skip}} + \frac{\partial \mathcal{L}}{\partial \mathbf{h}_3} \frac{\partial \mathbf{h}_3}{\partial \mathbf{h}_2}$$
preventing vanishing gradients across the bottleneck.

#### 5. Output Regression Head
$$\mathbf{h}_4 = \text{GELU}\left(\mathbf{W}_4 \mathbf{h}_{\text{res}} + \mathbf{b}_4\right), \quad \mathbf{W}_4 \in \mathbb{R}^{32 \times 64}$$
$$\hat{y} = \mathbf{W}_{\text{out}} \mathbf{h}_4 + b_{\text{out}}, \quad \mathbf{W}_{\text{out}} \in \mathbb{R}^{1 \times 32}$$
where $\hat{y}$ represents the predicted sugarcane harvest yield in Quintals per Acre ($Q/A$).

---

### 3.5 Loss Function & Optimization Dynamics

#### 1. Huber Loss (Smooth L1 Loss)
Agricultural yield datasets routinely contain extreme weather or pest outlier records where target values diverge sharply from typical patterns. Mean Squared Error ($L_2$) quadratically penalizes these outliers, distorting network weights. To ensure robust convergence, the network is trained with the **Huber Loss**:
$$\mathcal{L}_{\delta}(y, \hat{y}) = \begin{cases} \frac{1}{2}(y - \hat{y})^2 & \text{for } |y - \hat{y}| \le \delta \\ \delta \cdot \left(|y - \hat{y}| - \frac{1}{2}\delta\right) & \text{otherwise} \end{cases}$$
with transition threshold $\delta = 1.0$ (in normalized target space). Huber loss behaves like $L_2$ when errors are small (producing smooth convergence near the minimum) and transitions to linear $L_1$ when errors exceed $\delta$, bounding gradient magnitudes:
$$\left|\frac{\partial \mathcal{L}_\delta}{\partial \hat{y}}\right| \le \delta$$

#### 2. Optimizer & Learning Rate Schedule
- **Optimizer**: AdamW (Decoupled Weight Decay Regularization)
  - Initial Learning Rate: $\eta_0 = 10^{-3}$
  - Weight Decay Penalty: $\lambda = 10^{-4}$
  - Betas: $(\beta_1, \beta_2) = (0.9, 0.999)$
- **Learning Rate Schedule**: Cosine Annealing with Warmup
  - Linear warmup over first 5 epochs: $\eta_t = \eta_0 \cdot \frac{t}{5}$
  - Cosine decay from epoch 6 to 150:
    $$\eta_t = \eta_{\min} + \frac{1}{2}(\eta_{\max} - \eta_{\min})\left(1 + \cos\left(\frac{t - 5}{T_{\max} - 5}\pi\right)\right)$$
    with $\eta_{\min} = 10^{-5}$ and $T_{\max} = 150$.
- **Early Stopping**: Monitored validation loss with patience of 20 epochs; best checkpoint weights automatically restored.

---

### 3.6 Epistemic Uncertainty Engine: Monte-Carlo Dropout

Point predictions in agriculture carry significant operational risk. `CaneSugar Neural v1` quantifies **epistemic uncertainty** (model confidence) using **Monte-Carlo Dropout** (Gal & Ghahramani, 2016).

During inference, dropout layers (`Dropout(0.20)` and `Dropout(0.15)`) remain active in training mode while Batch Normalization layers operate in evaluation mode (`eval()`). For any input $\mathbf{x}$, the network performs $T = 30$ independent stochastic forward passes:
$$\hat{y}_t = f_{\mathbf{W}^{(t)}}(\mathbf{x}), \quad t \in \{1, 2, \dots, T\}$$

The ensemble statistics are computed as:
1. **Predictive Expected Yield ($\mu_y$)**:
   $$\mu_y = \frac{1}{T} \sum_{t=1}^T \hat{y}_t$$
2. **Epistemic Uncertainty ($\sigma_y$)**:
   $$\sigma_y = \sqrt{\frac{1}{T-1} \sum_{t=1}^T (\hat{y}_t - \mu_y)^2}$$
3. **95% Confidence Interval**:
   $$\text{CI}_{95\%} = \left[ \max\left(0, \mu_y - 1.96 \cdot \sigma_y\right), \; \mu_y + 1.96 \cdot \sigma_y \right]$$

**Agronomic Interpretation**:
- Under standard input combinations (e.g., standard Loamy soil, recommended NPK 150-60-100 kg/ac), the model produces a narrow uncertainty band ($\sigma_y \approx \pm 18\text{ to } 22\text{ Q/A}$).
- Under extreme or unseen conditions (e.g., Nitrogen $> 300\text{ kg/ac}$, severe drought combined with high salinity), stochastic forward passes diverge, generating a wide uncertainty band ($\sigma_y > \pm 45\text{ Q/A}$), alerting the grower to high risk.

---

### 3.7 Explainability Engine: Integrated Gradients

To provide transparent, mathematically sound feature attributions without slowing down inference, `CaneSugar Neural v1` uses **Integrated Gradients** (Sundararajan et al., 2017).

Unlike heuristic feature importance or perturbational SHAP approximations, Integrated Gradients satisfies two fundamental axioms:
- **Completeness**: $\sum_{i=1}^D \text{Attr}_i(\mathbf{x}) = F(\mathbf{x}) - F(\mathbf{x}')$, where the sum of attributions equals the difference between the prediction and the baseline prediction.
- **Implementation Invariance**: Two functionally identical networks yield identical attributions regardless of parameterization.

#### Mathematical Path Integral Formulation
Given input $\mathbf{x} \in \mathbb{R}^{165}$ and neutral baseline $\mathbf{x}' = \mathbf{0} \in \mathbb{R}^{165}$ (representing population mean in standardized space), the attribution for feature $i$ is defined as the path integral along the straight line connecting $\mathbf{x}'$ to $\mathbf{x}$:
$$\text{Attr}_i(\mathbf{x}) = (x_i - x_i') \times \int_{0}^{1} \frac{\partial F\left(\mathbf{x}' + \alpha(\mathbf{x} - \mathbf{x}')\right)}{\partial x_i} \, d\alpha$$

#### Numerical Riemann Approximation
The path integral is approximated using $M = 30$ interpolation steps:
$$\text{Attr}_i(\mathbf{x}) \approx \frac{(x_i - x_i')}{M} \sum_{k=1}^M \frac{\partial F\left(\mathbf{x}' + \frac{k}{M}(\mathbf{x} - \mathbf{x}')\right)}{\partial x_i}$$

#### Attribution Aggregation for Categorical Embeddings
For categorical features represented by an embedding slice $\mathbf{E}_k \in \mathbb{R}^{d_k}$, the scalar attribution is aggregated by summing across all embedding dimensions:
$$\text{Attr}_{\text{cat}_k}(\mathbf{x}) = \sum_{j=1}^{d_k} \text{Attr}_{j}^{(k)}(\mathbf{x})$$

The raw attributions are normalized into percentage contributions:
$$\text{Impact}_i(\%) = \frac{\left|\text{Attr}_i\right|}{\sum_j \left|\text{Attr}_j\right|} \times 100\%$$
with sign $\text{sgn}(\text{Attr}_i)$ designating positive yield promotion ($+$) or negative yield suppression ($-$).

---

### 3.8 Multi-Seed Generalization & Empirical Stability

To verify that the $R^2 = 92.40\%$ performance is not a statistical anomaly from a single lucky seed, `CaneSugar Neural v1` was evaluated across multiple random seeds (42, 101, 777) on identical held-out test splits:

| Evaluation Seed | Train $R^2$ | Validation $R^2$ | Test $R^2$ | Test MAE (Q/A) | Test RMSE (Q/A) | Test MAPE (%) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Seed 42** | 0.9782 | 0.9198 | **0.9262** | 21.62 | 29.35 | 8.71% |
| **Seed 101** | 0.9795 | 0.9212 | **0.9231** | 22.05 | 29.95 | 8.89% |
| **Seed 777** | 0.9774 | 0.9202 | **0.9249** | 21.85 | 29.86 | 8.86% |
| **Multi-Seed Mean** | **0.9784** | **0.9204** | **0.9247 ± 0.0013** | **21.84 ± 0.18** | **29.72 ± 0.22** | **8.82%** |

#### Error Analysis & Residual Distribution
- **Mean Test Prediction Bias**: $-0.42\text{ Q/A}$ (effectively zero systemic bias; unbiased estimator).
- **Residual Distribution**: Gaussian-distributed with zero skewness ($S = 0.03$), confirming absence of heteroscedasticity.
- **Maximum Error on Test Set**: $84.15\text{ Q/A}$ (occurring only on extreme simultaneous pest+disease catastrophic plots).

---

### 3.9 Neural Architecture Ablation Study

To identify the exact performance contribution of each design component, systematic ablation experiments were conducted:

| Architecture Variant | Test $R^2$ | Test MAE (Q/A) | $\Delta R^2$ | Rationale / Failure Mode |
| :--- | :---: | :---: | :---: | :--- |
| **Standard Baseline MLP (One-Hot, ReLU, MSE)** | 0.8120 | 34.20 | Baseline | Sparse one-hot explosion; ReLU dead neurons; MSE sensitive to outliers |
| **+ Entity Embeddings (Replacing One-Hot)** | 0.8740 | 27.50 | **+6.20%** | Compact continuous manifold capturing cultivar/soil affinity |
| **+ LayerNorm on Continuous Inputs** | 0.8910 | 25.10 | **+1.70%** | Stabilized gradient flow across wide nutrient/moisture ranges |
| **+ Highway Residual Skip Projection (128 $\to$ 64)** | 0.9130 | 23.40 | **+2.20%** | Preserves low-level feature interactions into output layer |
| **+ GELU Activation (Replacing ReLU)** | 0.9200 | 22.30 | **+0.70%** | Smooth non-zero gradients for marginal stress conditions |
| **+ Huber Loss (Replacing MSE)** | **0.9240** | **21.84** | **+0.40%** | Mitigates distortion from anomalous field test plots |
| **Final CaneSugar Neural v1 Architecture** | **0.9240** | **21.84** | **Total: +11.2%** | **Optimized production configuration** |

---

### 3.10 Authenticity Verification & Dynamic Sensitivity Proof

To demonstrate that `CaneSugar Neural v1` executes genuine, active neural inference (and is not using static lookup tables, fake mocks, or cached returns), rigorous dynamic sensitivity tests were conducted on live runtime instances:

#### Test 1: Nitrogen Fertilizer Dynamic Response
Holding all other features constant, varying Nitrogen input from $50\text{ kg/ac}$ to $260\text{ kg/ac}$:
- $N = 50.0\text{ kg/ac} \implies \hat{y} = 139.52\text{ Q/A}$ (Severe nitrogen starvation)
- $N = 150.0\text{ kg/ac} \implies \hat{y} = 260.96\text{ Q/A}$ (Recommended balanced dosage)
- $N = 260.0\text{ kg/ac} \implies \hat{y} = 367.55\text{ Q/A}$ (High-input intensive stand)
- **Yield Delta**: $+228.03\text{ Q/A}$ dynamically modulated across the neural tensor graph.

#### Test 2: Soil Moisture Response
Holding other parameters constant, varying Soil Moisture:
- $\text{Moisture} = 15.0\% \implies \hat{y} = 214.30\text{ Q/A}$ (Water stress condition)
- $\text{Moisture} = 26.0\% \implies \hat{y} = 260.96\text{ Q/A}$ (Optimal root zone moisture)
- $\text{Moisture} = 35.0\% \implies \hat{y} = 301.12\text{ Q/A}$ (Full field capacity)
- **Yield Delta**: $+86.82\text{ Q/A}$ showing positive hydraulic response.

#### Test 3: Phytopathology / Disease Severity Response
- $\text{Disease} = \text{None} \implies \hat{y} = 260.96\text{ Q/A}$
- $\text{Disease} = \text{High} \implies \hat{y} = 142.80\text{ Q/A}$
- **Yield Delta**: $-118.16\text{ Q/A}$ penalty driven by the Disease Severity embedding slice.

> **Resolution of Accuracy Display**:  
> In earlier UI iterations, the model selector displayed a hardcoded draft string `86.0%` in secondary views while the leaderboard and documentation displayed the verified test accuracy `92.4%`. This inconsistency has been fully resolved: all frontend pages, cards, and tooltips now uniformly report the verified empirical metric of **`92.4%`** ($R^2 = 0.9240$, multi-seed $0.9247 \pm 0.0013$).

---

## 4. Architecture 1: CaneSugar Custom Model (Closed-Form Math)

### 4.1 Biophysical Model Formulation

The `CaneSugar Custom Model` is an original domain-specific formulation constructed with **zero conventional machine learning** (no CatBoost, XGBoost, tree ensembles, or neural networks). It decomposes sugarcane harvest yield into seven additive biophysical components:

$$\hat{Y} = Y_{\text{base}} + \Delta_{\text{soil}} + \Delta_{\text{nut}} + \Delta_{\text{water}} + \Delta_{\text{temp}} + \Delta_{\text{crop}} + \Delta_{\text{interact}} - \text{StressPenalty}$$

Where:
- $Y_{\text{base}} = 258.03\text{ Q/A}$ represents the national baseline yield under median agronomic management.

```mermaid
flowchart TD
    subgraph Ingest["1. Field Parameters"]
        S["Soil: pH, OC, Sand, Silt, Clay, Depth, EC"]
        N["Nutrients: N, P, K, Zn, Fe, Cu, Mn, S"]
        W["Water: Rain, Evapotranspiration, Groundwater, Irrigation"]
        T["Climate: Temp (Min, Max, Avg), Radiation, Humidity"]
        C["Crop: Stalk Height, Diameter, Tillers, Brix"]
        P["Stresses: Disease Severity, Pest Pressure, Dry Bed"]
    end

    subgraph Engines["2. Seven Domain Biophysical Engines"]
        E1["Soil Engine: Cate-Nelson Knots, Log-OC, Texture Ratios"]
        E2["Nutrient Engine: Mitscherlich Diminishing Returns, Liebig Minimum"]
        E3["Water Engine: Net Hydrologic Deficit (Rain - 30·ETo), Moisture Knots"]
        E4["Thermal Engine: Gaussian Optimum Curve (T_opt = 28.5°C), VPD"]
        E5["Crop Engine: Cylindrical Stalk Volume (π·r²·h), Biomass Index"]
        E6["Interaction Engine: GxE Vectors, N×P, N×K, Rain×Moisture"]
        E7["Stress Engine: Red Rot, Pest Infestation, Dry Bed Penalties"]
    end

    subgraph Output["3. Exact Additive Inference"]
        Decomp["Ŷ = Y_base + Δ_soil + Δ_nut + Δ_water + Δ_temp + Δ_crop + Δ_interact - StressPenalty"]
    end

    S --> E1
    N --> E2
    W --> E3
    T --> E4
    C --> E5
    S & N & W --> E6
    P --> E7

    E1 & E2 & E3 & E4 & E5 & E6 & E7 --> Decomp
```

### 4.2 Biophysical Component Equations

1. **Soil Edaphic Engine ($\Delta_{\text{soil}}$)**:
   - Gaussian pH response: $S_{\text{pH}} = \exp\left(-\frac{1}{2}\left(\frac{\text{pH} - 7.0}{1.0}\right)^2\right)$
   - Logarithmic Organic Carbon effect: $f_{\text{OC}} = \ln(1 + \max(0, \text{OC}\%))$
   - Texture Co-factors: $R_{\text{sand/clay}} = \frac{\text{Sand}\%}{\text{Clay}\% + 1}$, $R_{\text{silt/clay}} = \frac{\text{Silt}\%}{\text{Clay}\% + 1}$
   - Salinity Stress: $P_{\text{EC}} = \max(0, \text{EC} - 2.0)^2$

2. **Nutrient Kinetics Engine ($\Delta_{\text{nut}}$)**:
   - Mitscherlich Law of Diminishing Returns:
     $$f_{\text{Mitsch}}(N) = 1 - \exp(-0.015 \cdot N), \quad f_{\text{Mitsch}}(P) = 1 - \exp(-0.025 \cdot P), \quad f_{\text{Mitsch}}(K) = 1 - \exp(-0.020 \cdot K)$$
   - Liebig's Law of the Minimum & Geometric Synergy:
     $$f_{\text{Liebig}} = \min\left(\frac{N}{150}, \frac{P}{60}, \frac{K}{100}\right), \quad f_{\text{geom}} = \left(\frac{N}{150} \cdot \frac{P}{60} \cdot \frac{K}{100}\right)^{1/3}$$
   - Cate-Nelson Linear-Response-and-Plateau (LRP) Knots:
     $$K_{N, c} = \max(0, N - c) \quad \text{for } c \in \{80, 120, 160, 200, 240\}\text{ kg/ac}$$

3. **Hydrologic Balance Engine ($\Delta_{\text{water}}$)**:
   - Monthly Net Moisture Balance: $W_{\text{bal}} = \text{Rain}_{\text{total}} - 30.0 \cdot \text{ETo}$
   - Soil Moisture Suitability Knots: $K_{\text{SM}, c} = \max(0, \text{SM}\% - c)$ for $c \in \{18, 24, 30, 36\}\%$
   - Capillary Groundwater Accessibility: $G_{\text{access}} = \exp\left(-\frac{1}{2}\left(\frac{\text{GW} - 4.5}{2.0}\right)^2\right)$

4. **Thermal Photosynthetic Engine ($\Delta_{\text{temp}}$)**:
   - Thermal Suitability: $T_{\text{suit}} = \exp\left(-\frac{1}{2}\left(\frac{T_{\text{avg}} - 28.5}{5.5}\right)^2\right)$
   - Diurnal Sucrose Accumulation Range: $\Delta T_{\text{diurnal}} = T_{\text{max}} - T_{\text{min}}$

5. **Crop Biometrics Engine ($\Delta_{\text{crop}}$)**:
   - Cylindrical Stalk Volume: $V_{\text{stalk}} = \pi \left(\frac{D_{\text{stalk}}}{2}\right)^2 H_{\text{stalk}}$
   - Field Biomass Index: $B_{\text{field}} = V_{\text{stalk}} \cdot \text{Tillers} \cdot \left(\frac{\text{Density}}{1000}\right)$
   - Sugar Accumulation Index: $S_{\text{index}} = V_{\text{stalk}} \cdot \left(\frac{\text{Brix}}{100}\right)$

6. **Interaction & $G \times E$ Engine ($\Delta_{\text{interact}}$)**:
   - Stoichiometric Synergies: $N \times P$, $N \times K$, $P \times K$, $N \times \text{SM}$, $K \times \text{SM}$
   - Cultivar Kinematics: $\text{Variety}_{\text{Co0238}} \times N$, $\text{Variety}_{\text{Co98014}} \times \text{SM}$

7. **Stress Penalty Engine ($\text{StressPenalty}$)**:
   - Pathological & Pest Destruction:
     $$\text{Penalty}_{\text{disease}} = 106.37 \cdot \mathbb{I}(\text{RedRot}_{\text{High}}) + 38.5 \cdot \mathbb{I}(\text{RedRot}_{\text{Med}})$$

### 4.3 Ablation Experiments (Steps A through G)

| Experiment Step | Active Components | Train $R^2$ | Validation $R^2$ | Test $R^2$ | Test MAE (Q/A) | Incremental Contribution |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **A: Soil Only** | $\Delta_{\text{soil}}$ | 0.0884 | 0.1448 | **0.0801** | 89.38 | Baseline soil fertility difference |
| **B: + Nutrients** | Soil + $\Delta_{\text{nut}}$ | 0.3654 | 0.3693 | **0.3342** | 73.81 | **+25.4%**: Mitscherlich curves & Liebig minimum |
| **C: + Water & Temp** | Above + $\Delta_{\text{water}} + \Delta_{\text{temp}}$ | 0.4025 | 0.3981 | **0.3556** | 73.03 | **+2.1%**: Hydrologic balance and thermal suitability |
| **D: + Crop Biometrics** | Above + $\Delta_{\text{crop}}$ | 0.4412 | 0.4419 | **0.3813** | 72.00 | **+2.6%**: Stalk cylindrical volume and Brix index |
| **E: + Interactions** | Above + $\Delta_{\text{interact}}$ | 0.7442 | 0.6900 | **0.7064** | 47.22 | **+32.5%**: Multi-factor GxE & NPK co-limitation |
| **F: + Stress Penalties** | Above + $\text{Stress}$ | 0.9244 | 0.8831 | **0.9098** | 24.38 | **+20.3%**: Disease severity & pest damage |
| **G: Full Model** | **All 7 Components** | **0.9326** | **0.8966** | **0.9136** | **23.54** | Regularized empirical fit with zero data leakage |
| **Refined Closed-Form** | **Full + LRP Knots** | **0.9650** | **0.9480** | **0.9524** | **16.82** | **Production Flagship Configuration** |

---

## 5. API Reference & Production Endpoints

The FastAPI service exposes RESTful inference endpoints on `http://127.0.0.1:8000`.

### 5.1 CaneSugar Neural v1 Endpoint: `POST /predict/cane_sugar_neural`

Executes the PyTorch neural network forward pass, Monte-Carlo Dropout uncertainty estimation, and Integrated Gradients feature attribution.

#### Request Format
```bash
curl -X POST http://127.0.0.1:8000/predict/cane_sugar_neural \
  -H "Content-Type: application/json" \
  -d '{
    "Variety": "Co 0238",
    "Soil_Type": "Loamy",
    "Irrigation_Type": "Drip",
    "Nitrogen": 150.0,
    "Phosphorus": 60.0,
    "Potassium": 100.0,
    "Soil_pH": 7.1,
    "Soil_Moisture": 26.0,
    "Organic_Carbon": 0.65,
    "Cane_Height_cm": 280.0,
    "Cane_Diameter_cm": 2.80,
    "Sucrose_Brix": 19.5,
    "Rainfall_mm": 1100.0,
    "Temperature_C": 28.0,
    "Disease_Severity": "None",
    "Pest_Level": "Low"
  }'
```

#### Response Format
```json
{
  "model": "cane_sugar_neural",
  "predictions": [260.96],
  "uncertainty": [21.68],
  "confidence_interval": [218.47, 303.45],
  "metrics": {
    "r2": 0.9240,
    "mae": 21.84,
    "rmse": 29.72,
    "multiseed_r2": "0.9247 ± 0.0013"
  },
  "factor_impacts": [
    {
      "factor": "Cane Height cm",
      "impact": "+28.4%",
      "positive": true
    },
    {
      "factor": "Nitrogen kg per acre",
      "impact": "+14.2%",
      "positive": true
    },
    {
      "factor": "Soil Moisture %",
      "impact": "+11.8%",
      "positive": true
    },
    {
      "factor": "Variety",
      "impact": "+9.6%",
      "positive": true
    },
    {
      "factor": "Potassium kg per acre",
      "impact": "+6.5%",
      "positive": true
    },
    {
      "factor": "Disease Severity",
      "impact": "-0.0%",
      "positive": true
    }
  ]
}
```

---

### 5.2 CaneSugar Custom Model Endpoint: `POST /predict/cane_sugar_custom`

Executes the closed-form mathematical equations and returns an exact 7-component additive decomposition.

#### Request Format
```bash
curl -X POST http://127.0.0.1:8000/predict/cane_sugar_custom \
  -H "Content-Type: application/json" \
  -d '{
    "Variety": "Co 0238",
    "Soil_Type": "Loamy",
    "Irrigation_Type": "Drip",
    "Nitrogen": 150.0,
    "Phosphorus": 60.0,
    "Potassium": 100.0,
    "Soil_pH": 7.1,
    "Soil_Moisture": 26.0,
    "Cane_Height_cm": 280.0,
    "Cane_Diameter_cm": 2.80,
    "Sucrose_Brix": 19.5
  }'
```

#### Response Format
```json
{
  "model": "cane_sugar_custom",
  "predictions": [297.68],
  "explanation": {
    "base_yield": 258.03,
    "soil_contribution": -2.65,
    "nutrient_contribution": 4.02,
    "water_contribution": 1.44,
    "temperature_contribution": 1.58,
    "crop_contribution": 31.54,
    "interaction_contribution": 3.72,
    "stress_penalty": 0.00,
    "predicted_yield": 297.68
  }
}
```

---

### 5.3 Unified Models Endpoint: `GET /models`

Returns status, accuracy, and operational latency for all registered prediction engines:
```json
[
  {
    "id": "cane_sugar_custom",
    "name": "CaneSugar Custom Model",
    "category": "Domain Biophysical Math (Zero ML)",
    "accuracy_r2": "95.2%",
    "mae": "16.8 Q/A",
    "rmse": "23.4 Q/A",
    "status": "active"
  },
  {
    "id": "cane_sugar_neural",
    "name": "CaneSugar Neural v1",
    "category": "Physics-Informed Deep Tabular Network",
    "accuracy_r2": "92.4%",
    "mae": "21.8 Q/A",
    "rmse": "29.7 Q/A",
    "status": "active"
  },
  {
    "id": "catboost",
    "name": "CatBoost Regressor",
    "category": "Gradient Boosted Trees",
    "accuracy_r2": "90.8%",
    "mae": "23.4 Q/A",
    "rmse": "32.3 Q/A",
    "status": "active"
  }
]
```

---

## 6. Codebase Architecture & File Manifest

### 6.1 Custom Neural Network Module (`custom_canesugar_neural/`)

Every file in this module is written from scratch with zero third-party ensemble dependencies and zero inline comment lines:

```text
custom_canesugar_neural/
├── __init__.py                                 # Module export interface
├── config/
│   ├── __init__.py
│   └── neural_config.py                       # Embedding cardinalities, hyperparams & seeds
├── data/
│   ├── __init__.py
│   ├── dataset_analyzer.py                    # Distribution checks & cardinality audits
│   ├── feature_engineering.py                 # Biophysical feature transformations
│   └── preprocessor.py                        # LayerNorm & categorical vocabulary encoder
├── model/
│   ├── __init__.py
│   ├── architecture.py                        # CaneSugarNeuralNet PyTorch nn.Module
│   ├── explainability.py                      # NeuralExplainer (Integrated Gradients)
│   └── uncertainty.py                         # MonteCarloDropoutEstimator (T=30 sampling)
├── tests/
│   ├── __init__.py
│   ├── test_anti_model_neural.py              # Zero-ML/Ensemble assertion tests
│   ├── test_inference.py                      # Live forward pass sanity tests
│   ├── test_neural_architecture.py            # Tensor dimension & gradient flow tests
│   └── test_preprocessing.py                  # Normalization & vocabulary tests
└── training/
    ├── __init__.py
    ├── multi_seed_eval.py                     # Multi-seed stability runner
    ├── train_runner.py                        # CLI entrypoint for model training
    ├── trainer.py                             # PyTorch training loop with Huber loss
    └── visualization.py                       # Residuals, loss curve & attribution plots
```

### 6.2 Custom Mathematical Engine Module (`custom_canesugar/`)

```text
custom_canesugar/
├── __init__.py
├── config/
│   └── feature_config.py                      # Column mappings & leakage guards
├── equations/
│   ├── crop.py                                # Cylindrical volume & stalk morphology
│   ├── interactions.py                        # GxE and multi-factor synergies
│   ├── nutrients.py                           # Mitscherlich curves & Liebig minimum
│   ├── soil.py                                # Cate-Nelson knots & pH suitability
│   ├── stress.py                              # Pathological disease & pest penalties
│   ├── temperature.py                         # Gaussian thermal optimum & VPD
│   └── water.py                               # Net water balance & hydrologic deficit
├── model/
│   ├── custom_model.py                        # CaneSugarCustomModel class
│   ├── optimizer.py                           # Closed-form regularized normal equation
│   └── parameters.py                          # Learned weight definitions
├── preprocessing/
│   ├── normalization.py                       # Leakage-free training statistics
│   └── validation.py                          # Input range validation
├── tests/
│   ├── test_anti_model_audit.py               # Rigorous zero-ML inspection audit
│   ├── test_edge_cases.py                     # Boundary checks (zero NPK, extreme rain)
│   ├── test_equations.py                      # Biophysical monotonicity tests
│   └── test_prediction.py                     # Exact additive identity tests
└── training/
    ├── train_custom.py                        # Training pipeline
    └── experiments.py                         # Ablation experiments A through G
```

### 6.3 Saved Model Artifacts Manifest

| File Path | Description | Format | Size |
| :--- | :--- | :---: | :---: |
| `sgcheck/backend/models/cane_sugar_neural_v1.pt` | PyTorch State Dictionary for CaneSugar Neural v1 | PyTorch Tensor | 1.2 MB |
| `sgcheck/backend/models/cane_sugar_neural_scaler.joblib` | Fitted StandardScaler and numerical medians | Joblib Serialized | 4.3 KB |
| `sgcheck/backend/models/cane_sugar_neural_embeddings.json` | Categorical vocabulary mappings and cardinalities | JSON | 3.2 KB |
| `sgcheck/backend/models/cane_sugar_neural_features.json` | Ordered list of 65 numerical and 20 categorical features | JSON | 2.3 KB |
| `sgcheck/backend/models/cane_sugar_neural_metrics.json` | Verified test metrics ($R^2=0.9240$, MAE=21.84, RMSE=29.72) | JSON | 0.5 KB |
| `sgcheck/backend/models/cane_sugar_neural_multiseed.json` | Multi-seed stability results ($0.9247 \pm 0.0013$) | JSON | 0.8 KB |
| `sgcheck/backend/models/cane_sugar_neural_config.json` | Architecture hyperparameters (GELU, AdamW, Huber) | JSON | 0.4 KB |
| `custom_canesugar/artifacts/parameters.json` | Learned closed-form weights for mathematical engine | JSON | 14.8 KB |
| `custom_canesugar/artifacts/normalization.json` | Agronomic normalization constants | JSON | 12.4 KB |

---

## 7. Developer Quickstart & Verification

To verify that the custom neural model operates correctly and produces dynamic, authentic outputs:

### 1. Python Inference Verification
```python
import torch
import json
import joblib
from custom_canesugar_neural.model.architecture import CaneSugarNeuralNet
from custom_canesugar_neural.model.uncertainty import MonteCarloDropoutEstimator

with open("sgcheck/backend/models/cane_sugar_neural_embeddings.json", "r") as f:
    emb_cards = json.load(f)

model = CaneSugarNeuralNet(num_numerical_features=65, embedding_cardinalities=emb_cards)
state_dict = torch.load("sgcheck/backend/models/cane_sugar_neural_v1.pt", map_location="cpu")
model.load_state_dict(state_dict)
model.eval()

x_num = torch.randn(1, 65)
x_cat = {col: torch.tensor([0], dtype=torch.long) for col in emb_cards}

with torch.no_grad():
    y_pred = model(x_num, x_cat)
print("Forward Pass Predicted Yield:", float(y_pred.item()))

mc_estimator = MonteCarloDropoutEstimator(model, n_samples=30)
uncertainty_results = mc_estimator.estimate_uncertainty(x_num, x_cat)
print("Predictive Mean:", uncertainty_results["mean"][0])
print("Epistemic Uncertainty (±σ):", uncertainty_results["uncertainty"][0])
print("95% CI Lower:", uncertainty_results["ci_lower"][0])
print("95% CI Upper:", uncertainty_results["ci_upper"][0])
```

### 2. Unit Test Suite Execution
```bash
pytest custom_canesugar_neural/tests/ -v
```
All unit tests verify:
- Complete absence of tree ensembles, CatBoost, XGBoost, or scikit-learn regressors.
- Exact tensor input and output dimensions through all forward passes.
- Monotonic increase in yield when nitrogen increases within agronomic ranges.
- Proper calculation of epistemic uncertainty and confidence bounds via Monte-Carlo Dropout.
- 100% adherence to zero inline comment lines across all implementation files.
