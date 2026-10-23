
"use strict";

/*
 * MI-YO-IA · MEM 1.1
 * Motor experimental para GitHub Pages.
 *
 * Incluye:
 * - MEM-Q: validación de entradas y estados.
 * - MEM-D: seguimiento de estabilidad de q.
 * - MEM-R: registro reproducible de eventos.
 *
 * Nota: no es un modelo físico validado ni una IA neuronal.
 * Las tolerancias deben justificarse con el modelo original.
 */

(function (root) {
  const CONFIG = Object.freeze({
    version: "1.1",
    seed: 73,
    qReference: 0.30,
    qTolerance: 0.00030,
    maxHistory: 500
  });

  function finiteNumber(value, name) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      throw new TypeError(name + " debe ser un número finito.");
    }

    return number;
  }

  // Generador pseudoaleatorio reproducible para pruebas.
  function createRandom(seed = CONFIG.seed) {
    let state = seed >>> 0;

    return function random() {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  class MEMState {
    constructor(options = {}) {
      this.seed = options.seed ?? CONFIG.seed;
      this.qReference = finiteNumber(
        options.qReference ?? CONFIG.qReference,
        "qReference"
      );
      this.qTolerance = finiteNumber(
        options.qTolerance ?? CONFIG.qTolerance,
        "qTolerance"
      );

      if (this.qTolerance < 0) {
        throw new RangeError("La tolerancia no puede ser negativa.");
      }

      this.random = createRandom(this.seed);
      this.history = [];
      this.sequence = 0;
      this.lastState = null;
    }

    // MEM-Q: valida los valores de un estado.
    validate(input) {
      if (!input || typeof input !== "object") {
        throw new TypeError("El estado debe ser un objeto.");
      }

      const q = finiteNumber(input.q, "q");
      const dimensions = finiteNumber(
        input.dimensions ?? 2,
        "dimensions"
      );

      if (q < 0 || q > 1) {
        throw new RangeError("q debe estar entre 0 y 1.");
      }

      if (!Number.isInteger(dimensions) || dimensions < 1) {
        throw new RangeError(
          "dimensions debe ser un entero positivo."
        );
      }

      return Object.freeze({ q, dimensions });
    }

    // MEM-D: comprueba proximidad a qReference.
    // Es una prueba numérica, no una demostración física.
    checkStability(input) {
      const state = this.validate(input);
      const error = Math.abs(state.q - this.qReference);

      return Object.freeze({
        q: state.q,
        reference: this.qReference,
        absoluteError: error,
        tolerance: this.qTolerance,
        passed: error <= this.qTolerance
      });
    }

    // MEM-R: registra un estado y su resultado de validación.
    record(input, metadata = {}) {
      const state = this.validate(input);
      const stability = this.checkStability(state);

      const entry = Object.freeze({
        sequence: ++this.sequence,
        timestamp: new Date().toISOString(),
        seed: this.seed,
        state,
        stability,
        metadata: {
          ...metadata
        }
      });

      this.history.push(entry);

      if (this.history.length > CONFIG.maxHistory) {
        this.history.shift();
      }

      this.lastState = entry;
      return entry;
    }

    // Repite una prueba usando la misma semilla.
    runDeterministicTest(count = 10) {
      if (!Number.isInteger(count) || count < 1 || count > 10000) {
        throw new RangeError("count debe ser un entero entre 1 y 10000.");
      }

      const random = createRandom(this.seed);
      const results = [];

      for (let i = 0; i < count; i++) {
        // Perturbación de prueba, no simulación física.
        const q = this.qReference +
          (random() * 2 - 1) * this.qTolerance;

        results.push({
          test: i + 1,
          q,
          ...this.checkStability({ q, dimensions: 2 })
        });
      }

      return {
        seed: this.seed,
        count,
        allPassed: results.every(result => result.passed),
        results
      };
    }

    getReport() {
      return {
        version: CONFIG.version,
        seed: this.seed,
        qReference: this.qReference,
        qTolerance: this.qTolerance,
        totalRecorded: this.sequence,
        retainedEntries: this.history.length,
        lastState: this.lastState,
        history: this.history.slice()
      };
    }

    reset() {
      this.history = [];
      this.sequence = 0;
      this.lastState = null;
      this.random = createRandom(this.seed);
    }
  }

  root.MEM = Object.freeze({
    version: CONFIG.version,
    config: CONFIG,
    MEMState
  });
})(globalThis);
