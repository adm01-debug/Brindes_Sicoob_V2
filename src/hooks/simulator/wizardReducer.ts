/**
 * Wizard reducer extracted from useSimulatorWizard
 */
import type {
  SimulatorWizardState,
  WizardAction,
} from '@/types/domain/simulator-wizard';

export const initialState: SimulatorWizardState = {
  currentStep: 'product',
  selectedProduct: null,
  quantity: 100,
  personalizations: [],
  currentPersonalizationIndex: 0,
  isEditingPersonalization: false,
  availableLocations: [],
  selectedLocation: null,
  engravingSpecs: { colors: 1, width: 5, height: 5 },
  comparisonResults: [],
  selectedComparison: null,
  isCalculating: false,
  error: null,
};

function engravingSpecsForLocation(location: SimulatorWizardState['selectedLocation']) {
  return {
    colors: 1,
    width: Math.min(5, location?.maxWidthCm || 50),
    height: Math.min(5, location?.maxHeightCm || 50),
  };
}

function reduceWizardSetup(state: SimulatorWizardState, action: WizardAction): SimulatorWizardState | null {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'SELECT_PRODUCT':
      return {
        ...state, selectedProduct: action.payload,
        personalizations: [], currentPersonalizationIndex: 0,
        isEditingPersonalization: false, selectedLocation: null,
        availableLocations: [], comparisonResults: [], selectedComparison: null,
      };
    case 'SET_QUANTITY':
      return {
        ...state, quantity: action.payload,
        comparisonResults: [], selectedComparison: null,
        personalizations: state.personalizations.map(p => ({
          ...p, pricing: { ...p.pricing, _needsRecalc: true },
        })),
      };
    case 'SET_AVAILABLE_LOCATIONS':
      return { ...state, availableLocations: action.payload };
    case 'SELECT_LOCATION':
      return {
        ...state, selectedLocation: action.payload,
        comparisonResults: [], selectedComparison: null,
        engravingSpecs: engravingSpecsForLocation(action.payload),
      };
    case 'UPDATE_SPECS':
      return { ...state, engravingSpecs: { ...state.engravingSpecs, ...action.payload }, comparisonResults: [], selectedComparison: null };
    default:
      return null;
  }
}

function reduceWizardResults(state: SimulatorWizardState, action: WizardAction): SimulatorWizardState | null {
  switch (action.type) {
    case 'SET_COMPARISON_RESULTS':
      return { ...state, comparisonResults: action.payload };
    case 'SELECT_COMPARISON':
      return { ...state, selectedComparison: action.payload };
    case 'REMOVE_ALL_PERSONALIZATIONS':
      return { ...state, personalizations: [] };
    case 'SET_CALCULATING':
      return { ...state, isCalculating: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET_WIZARD':
      return initialState;
    default:
      return null;
  }
}

function reducePersonalizationChanges(state: SimulatorWizardState, action: WizardAction): SimulatorWizardState | null {
  switch (action.type) {
    case 'ADD_PERSONALIZATION':
      return {
        ...state, personalizations: [...state.personalizations, action.payload],
        currentPersonalizationIndex: state.personalizations.length,
        isEditingPersonalization: false, selectedLocation: null,
        selectedComparison: null, comparisonResults: [],
        engravingSpecs: { colors: 1, width: 5, height: 5 },
        currentStep: 'comparison',
      };
    case 'REMOVE_PERSONALIZATION': {
      const newPersonalizations = state.personalizations
        .filter(p => p.id !== action.payload)
        .map((p, idx) => ({ ...p, index: idx + 1 }));
      return { ...state, personalizations: newPersonalizations };
    }
    case 'UPDATE_PERSONALIZATION': {
      const { index: editIndex, personalization: updatedPers } = action.payload;
      const updatedPersonalizations = [...state.personalizations];
      updatedPersonalizations[editIndex] = updatedPers;
      return {
        ...state,
        personalizations: updatedPersonalizations.map((p, idx) => ({ ...p, index: idx + 1 })),
        isEditingPersonalization: false, selectedLocation: null,
        selectedComparison: null, comparisonResults: [],
        engravingSpecs: { colors: 1, width: 5, height: 5 },
        currentStep: 'comparison',
      };
    }
    case 'EDIT_PERSONALIZATION': {
      const pers = state.personalizations[action.payload];
      if (!pers) return state;
      return {
        ...state, currentPersonalizationIndex: action.payload,
        isEditingPersonalization: true, selectedLocation: pers.location,
        engravingSpecs: pers.specs, comparisonResults: [],
        selectedComparison: null, currentStep: 'location',
      };
    }
    default:
      return null;
  }
}

function recalculatePersonalization(state: SimulatorWizardState, personalizationId: string, pricing: SimulatorWizardState['personalizations'][number]['pricing']): SimulatorWizardState {
  return {
    ...state,
    personalizations: state.personalizations.map(personalization =>
      personalization.id === personalizationId ? { ...personalization, pricing } : personalization,
    ),
  };
}

function reducePersonalizationFlow(state: SimulatorWizardState, action: WizardAction): SimulatorWizardState | null {
  switch (action.type) {
    case 'START_NEW_PERSONALIZATION':
      return {
        ...state, currentPersonalizationIndex: state.personalizations.length,
        isEditingPersonalization: false, selectedLocation: null,
        selectedComparison: null, comparisonResults: [],
        engravingSpecs: { colors: 1, width: 5, height: 5 },
        currentStep: 'location',
      };
    case 'CANCEL_PERSONALIZATION':
      return {
        ...state, isEditingPersonalization: false,
        selectedLocation: null, selectedComparison: null,
        currentStep: state.personalizations.length > 0 ? 'comparison' : 'product',
      };
    case 'RECALC_PERSONALIZATION_PRICING': {
      const { personalizationId, pricing } = action.payload;
      return recalculatePersonalization(state, personalizationId, pricing);
    }
    case 'DUPLICATE_PERSONALIZATION': {
      const { sourceId, targetLocation } = action.payload;
      const source = state.personalizations.find(p => p.id === sourceId);
      if (!source) return state;
      const newPers = {
        ...source, id: `pers-${Date.now()}`,
        index: state.personalizations.length + 1,
        location: targetLocation,
        pricing: { ...source.pricing, _needsRecalc: true },
      };
      return {
        ...state, personalizations: [...state.personalizations, newPers],
        currentStep: 'comparison' as const,
      };
    }
    default:
      return null;
  }
}

export function wizardReducer(state: SimulatorWizardState, action: WizardAction): SimulatorWizardState {
  return reduceWizardSetup(state, action)
    ?? reduceWizardResults(state, action)
    ?? reducePersonalizationChanges(state, action)
    ?? reducePersonalizationFlow(state, action)
    ?? state;
}
