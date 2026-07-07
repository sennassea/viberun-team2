"use strict";

window.BOHYUN_BALANCE = {
  startGold: 100,
  act1MonsterPackageOverrides: {
    HN01: {
      nurse_spirit: {
        maxHp: 20,
        moves: {
          "0": {
            v: 2
          },
          "1": {
            v: 2
          },
          "2": {
            v: 4
          }
        }
      },
      patient_spirit_waiting: {
        maxHp: 19,
        moves: {
          "1": {
            v: 2
          },
          "2": {
            v: 3,
            conditionalDamage: {
              v: 4
            }
          }
        }
      }
    },
    HN02: {
      child_spirit_underbed: {
        maxHp: 15,
        moves: {
          "0": {
            v: 4
          },
          "1": {
            v: 2
          },
          "2": {
            v: 3
          },
          "3": {
            v: 3
          }
        }
      },
      nurse_spirit: {
        maxHp: 20,
        moves: {
          "0": {
            v: 3
          },
          "1": {
            v: 2
          },
          "2": {
            v: 3
          }
        }
      }
    },
    HN03: {
      nurse_spirit_lamp: {
        maxHp: 17,
        moves: {
          "0": {
            v: 4
          },
          "1": {
            v: 3
          },
          "2": {
            v: 5
          }
        }
      },
      patient_spirit_waiting: {
        maxHp: 22,
        moves: {
          "1": {
            v: 3
          },
          "2": {
            v: 4,
            conditionalDamage: {
              v: 5
            }
          }
        }
      }
    },
    HN04: {
      visitor_spirit_flower: {
        maxHp: 20,
        moves: {
          "1": {
            v: 2
          },
          "2": {
            v: 4
          }
        }
      },
      nurse_spirit: {
        maxHp: 21,
        moves: {
          "0": {
            v: 3
          },
          "1": {
            v: 3
          },
          "2": {
            v: 4
          }
        }
      }
    },
    HN05: {
      child_spirit_underbed: {
        maxHp: 16,
        moves: {
          "0": {
            v: 5
          },
          "1": {
            v: 1
          },
          "2": {
            v: 3
          },
          "3": {
            v: 3
          }
        }
      },
      nurse_spirit_lamp: {
        maxHp: 15,
        moves: {
          "0": {
            v: 4
          },
          "1": {
            v: 2
          },
          "2": {
            v: 3
          }
        }
      },
      nurse_spirit: {
        maxHp: 21,
        moves: {
          "0": {
            v: 3
          },
          "1": {
            v: 2
          },
          "2": {
            v: 3
          }
        }
      }
    },
    HN06: {
      grandmother_spirit_visit: {
        maxHp: 20,
        moves: {
          "1": {
            v: 1
          },
          "3": {
            v: 3,
            counterDamage: {
              per: 1
            }
          }
        }
      },
      patient_spirit_waiting: {
        maxHp: 19,
        moves: {
          "1": {
            v: 2
          },
          "2": {
            v: 2,
            conditionalDamage: {
              v: 3
            }
          }
        }
      },
      nurse_spirit: {
        maxHp: 21,
        moves: {
          "0": {
            v: 2
          },
          "1": {
            v: 2
          },
          "2": {
            v: 3
          }
        }
      }
    },
    HN07: {
      nurse_spirit_lamp: {
        maxHp: 16,
        moves: {
          "0": {
            v: 4
          },
          "1": {
            v: 2
          },
          "2": {
            v: 3
          }
        }
      },
      visitor_spirit_flower: {
        maxHp: 20,
        moves: {
          "1": {
            v: 2
          },
          "2": {
            v: 2
          }
        }
      },
      nurse_spirit: {
        maxHp: 21,
        moves: {
          "0": {
            v: 2
          },
          "1": {
            v: 2
          },
          "2": {
            v: 3
          }
        }
      }
    },
    HN08: {
      child_spirit_underbed: {
        maxHp: 14,
        moves: {
          "0": {
            v: 5
          },
          "1": {
            v: 2
          },
          "2": {
            v: 4
          },
          "3": {
            v: 2
          }
        }
      },
      grandmother_spirit_visit: {
        maxHp: 18,
        moves: {
          "1": {
            v: 2
          },
          "3": {
            v: 3,
            counterDamage: {
              per: 1
            }
          }
        }
      },
      patient_spirit_waiting: {
        maxHp: 18,
        moves: {
          "1": {
            v: 2
          },
          "2": {
            v: 2,
            conditionalDamage: {
              v: 4
            }
          }
        }
      },
      nurse_spirit: {
        maxHp: 17,
        moves: {
          "0": {
            v: 2
          },
          "1": {
            v: 2
          },
          "2": {
            v: 4
          }
        }
      }
    },
    HN09: {
      child_spirit_underbed: {
        maxHp: 14,
        moves: {
          "0": {
            v: 6
          },
          "1": {
            v: 2
          },
          "2": {
            v: 4
          },
          "3": {
            v: 2
          }
        }
      },
      nurse_spirit_lamp: {
        maxHp: 13,
        moves: {
          "0": {
            v: 5
          },
          "1": {
            v: 2
          },
          "2": {
            v: 3
          }
        }
      },
      visitor_spirit_flower: {
        maxHp: 17,
        moves: {
          "1": {
            v: 2
          },
          "2": {
            v: 2
          }
        }
      },
      nurse_spirit: {
        maxHp: 18,
        moves: {
          "0": {
            v: 2
          },
          "1": {
            v: 2
          },
          "2": {
            v: 4
          }
        }
      }
    },
    HE02: {
      doctor_spirit: {
        maxHp: 70,
        moves: {
          "0": {
            v: 3
          },
          "2": {
            v: 9,
            statusCardDamage: {
              per: 1,
              maxBonus: 3
            }
          },
          "3": {
            v: 5
          }
        }
      }
    },
    HE04: {
      mother_spirit: {
        maxHp: 46,
        gimmick: {
          burstDamage: 7
        },
        moves: {
          "0": {
            v: 4
          },
          "2": {
            v: 4
          }
        }
      },
      visitor_spirit_flower: {
        maxHp: 44,
        moves: {
          "1": {
            v: 2
          },
          "2": {
            v: 4
          }
        }
      }
    },
    HE05: {
      doctor_spirit: {
        maxHp: 48,
        moves: {
          "0": {
            v: 3
          },
          "2": {
            v: 7,
            statusCardDamage: {
              per: 1
            }
          },
          "3": {
            v: 4
          }
        }
      },
      patient_spirit_waiting: {
        maxHp: 42,
        moves: {
          "1": {
            v: 3
          },
          "2": {
            v: 3,
            conditionalDamage: {
              v: 4
            }
          }
        }
      }
    },
    HE06: {
      surgery_light_spirit: {
        maxHp: 47,
        moves: {
          "1": {
            v: 5
          },
          "3": {
            v: 9
          }
        }
      },
      nurse_spirit_lamp: {
        maxHp: 38,
        moves: {
          "0": {
            v: 5
          },
          "1": {
            v: 3
          },
          "2": {
            v: 5
          }
        }
      }
    },
    HE08: {
      doctor_spirit: {
        maxHp: 55,
        moves: {
          "0": {
            v: 2
          },
          "2": {
            v: 5,
            statusCardDamage: {
              per: 1,
              maxBonus: 2
            }
          },
          "3": {
            v: 3
          }
        }
      },
      surgery_light_spirit: {
        maxHp: 50,
        moves: {
          "1": {
            v: 4
          },
          "3": {
            v: 6
          }
        }
      }
    },
    HB01: {
      ward_wraith: {
        maxHp: 148,
        moves: {
          "1": {
            v: 8
          }
        },
        phaseConfig: {
          thresholds: [103, 58],
          phases: {
            "0": {
              moves: {
                "1": {
                  v: 8
                }
              }
            },
            "1": {
              moves: {
                "0": {
                  v: 11
                }
              }
            },
            "2": {
              moves: {
                "0": {
                  v: 15,
                  summonDamage: {
                    per: 1.5
                  }
                },
                "1": {
                  v: 8,
                  summonDamage: {
                    per: 1.5
                  }
                }
              }
            }
          }
        }
      },
      empty_bed_shadow: {
        maxHp: 12,
        moves: {
          "0": {
            v: 4
          }
        }
      }
    },
    PB01: {
      runner_spirit: {
        maxHp: 161,
        phaseConfig: {
          phases: {
            "0": {
              moves: {
                "0": {
                  v: 4
                },
                "2": {
                  v: 6,
                  speedBurst: {
                    damage: 8
                  }
                }
              }
            },
            "1": {
              moves: {
                "0": {
                  v: 4
                },
                "2": {
                  v: 6,
                  speedBurst: {
                    damage: 9
                  }
                }
              }
            },
            "2": {
              moves: {
                "0": {
                  v: 5
                },
                "1": {
                  v: 6
                },
                "2": {
                  v: 7,
                  speedBurst: {
                    damage: 10
                  }
                }
              }
            }
          },
          thresholds: [107, 54]
        },
        moves: {
          "0": {
            v: 4
          },
          "2": {
            v: 6
          }
        }
      }
    },
    PE02: {
      fountain_reflection_spirit: {
        maxHp: 70,
        moves: {
          "1": {
            v: 6
          },
          "3": {
            v: 10
          }
        }
      }
    },
    PE04: {
      grandfather_spirit: {
        maxHp: 57,
        moves: {
          "0": {
            v: 3,
            counterDamage: {
              per: 1
            }
          },
          "1": {
            v: 3,
            counterDamage: {
              per: 1
            }
          },
          "2": {
            v: 3,
            counterDamage: {
              per: 1
            }
          }
        }
      },
      grandmother_spirit_memory: {
        maxHp: 33,
        moves: {
          "1": {
            v: 2
          },
          "2": {
            v: 2,
            statusCardDamage: {
              per: 1
            }
          }
        }
      }
    },
    PE06: {
      lost_picnic_spirit: {
        maxHp: 50,
        moves: {
          "0": {
            v: 5
          },
          "1": {
            v: 4
          },
          "3": {
            v: 7,
            counterDamage: {
              per: 2
            }
          }
        }
      },
      nurse_spirit_callbell: {
        maxHp: 27,
        moves: {
          "2": {
            v: 2
          },
          "3": {
            v: 4
          }
        }
      }
    },
    PE07: {
      lost_picnic_spirit: {
        maxHp: 53,
        moves: {
          "0": {
            v: 5
          },
          "1": {
            v: 4
          },
          "3": {
            v: 6,
            counterDamage: {
              per: 1
            }
          }
        }
      },
      child_spirit_swallowed: {
        moves: {
          "0": {
            v: 1
          },
          "2": {
            v: 4,
            counterDamage: {
              per: 1
            }
          }
        },
        maxHp: 32
      }
    },
    PE08: {
      grandfather_spirit: {
        maxHp: 57,
        moves: {
          "0": {
            v: 3,
            counterDamage: {
              per: 1
            }
          },
          "1": {
            v: 3,
            counterDamage: {
              per: 1
            }
          },
          "2": {
            v: 3,
            counterDamage: {
              per: 1
            }
          }
        }
      },
      fountain_reflection_spirit: {
        maxHp: 48,
        moves: {
          "1": {
            v: 3
          },
          "3": {
            v: 4
          }
        }
      }
    },
    PN01: {
      child_spirit_lost: {
        maxHp: 23,
        moves: {
          "0": {
            v: 2
          },
          "1": {
            v: 2,
            counterDamage: {
              per: 1
            }
          }
        }
      },
      child_spirit_swallowed: {
        maxHp: 27,
        moves: {
          "0": {
            v: 1
          },
          "2": {
            v: 3,
            counterDamage: {
              per: 1
            }
          }
        }
      }
    },
    PN02: {
      grandmother_spirit: {
        maxHp: 23,
        moves: {
          "1": {
            v: 2
          },
          "2": {
            v: 3
          },
          "3": {
            v: 3
          }
        }
      },
      child_spirit_lost: {
        maxHp: 15,
        moves: {
          "0": {
            v: 2
          },
          "1": {
            v: 3,
            counterDamage: {
              per: 1
            }
          }
        }
      }
    },
    PN03: {
      grandmother_spirit_memory: {
        maxHp: 29,
        moves: {
          "1": {
            v: 2
          },
          "2": {
            v: 3,
            statusCardDamage: {
              per: 1
            }
          }
        }
      },
      child_spirit_lost: {
        maxHp: 21,
        moves: {
          "0": {
            v: 2
          },
          "1": {
            v: 3,
            counterDamage: {
              per: 1
            }
          }
        }
      }
    },
    PN04: {
      nurse_spirit_callbell: {
        maxHp: 22,
        moves: {
          "2": {
            v: 2
          },
          "3": {
            v: 4
          }
        }
      },
      child_spirit_lost: {
        maxHp: 21,
        moves: {
          "0": {
            v: 2
          },
          "1": {
            v: 3,
            counterDamage: {
              per: 1
            }
          }
        }
      }
    },
    PN05: {
      grandmother_spirit: {
        maxHp: 24,
        moves: {
          "1": {
            v: 2
          },
          "2": {
            v: 2
          },
          "3": {
            v: 4
          }
        }
      },
      grandmother_spirit_memory: {
        maxHp: 22,
        moves: {
          "1": {
            v: 2
          },
          "2": {
            v: 2,
            statusCardDamage: {
              per: 1
            }
          }
        }
      },
      child_spirit_lost: {
        maxHp: 15,
        moves: {
          "0": {
            v: 2
          },
          "1": {
            v: 2,
            counterDamage: {
              per: 1
            }
          }
        }
      }
    },
    PN06: {
      child_spirit_swallowed: {
        maxHp: 18,
        moves: {
          "0": {
            v: 1
          },
          "2": {
            v: 3,
            counterDamage: {
              per: 1
            }
          }
        }
      },
      nurse_spirit_callbell: {
        maxHp: 16,
        moves: {
          "2": {
            v: 2
          },
          "3": {
            v: 3
          }
        }
      },
      patient_spirit_iv: {
        maxHp: 22,
        moves: {
          "1": {
            v: 2
          },
          "2": {
            v: 3,
            statusCardDamage: {
              per: 1
            }
          }
        }
      }
    },
    PN07: {
      grandmother_spirit: {
        maxHp: 23,
        moves: {
          "1": {
            v: 2
          },
          "2": {
            v: 3
          },
          "3": {
            v: 4
          }
        }
      },
      patient_spirit_iv: {
        maxHp: 21,
        moves: {
          "1": {
            v: 2
          },
          "2": {
            v: 3,
            statusCardDamage: {
              per: 1
            }
          }
        }
      },
      child_spirit_swallowed: {
        maxHp: 18,
        moves: {
          "0": {
            v: 1
          },
          "2": {
            v: 3,
            counterDamage: {
              per: 1
            }
          }
        }
      }
    },
    PN08: {
      child_spirit_lost: {
        maxHp: 14,
        moves: {
          "0": {
            v: 2
          },
          "1": {
            v: 2,
            counterDamage: {
              per: 1
            }
          }
        }
      },
      child_spirit_swallowed: {
        maxHp: 16,
        moves: {
          "0": {
            v: 1
          },
          "2": {
            v: 3,
            counterDamage: {
              per: 1
            }
          }
        }
      },
      nurse_spirit_callbell: {
        maxHp: 15,
        moves: {
          "2": {
            v: 2
          },
          "3": {
            v: 2
          }
        }
      },
      grandmother_spirit: {
        maxHp: 22,
        moves: {
          "1": {
            v: 2
          },
          "2": {
            v: 2
          },
          "3": {
            v: 4
          }
        }
      }
    },
    PN09: {
      grandmother_spirit_memory: {
        maxHp: 21,
        moves: {
          "1": {
            v: 2
          },
          "2": {
            v: 2,
            statusCardDamage: {
              per: 1
            }
          }
        }
      },
      nurse_spirit_callbell: {
        maxHp: 16,
        moves: {
          "2": {
            v: 2
          },
          "3": {
            v: 2
          }
        }
      },
      child_spirit_swallowed: {
        maxHp: 17,
        moves: {
          "0": {
            v: 1
          },
          "2": {
            v: 3,
            counterDamage: {
              per: 1
            }
          }
        }
      },
      child_spirit_lost: {
        maxHp: 14,
        moves: {
          "0": {
            v: 2
          },
          "1": {
            v: 2,
            counterDamage: {
              per: 1
            }
          }
        }
      }
    },
    SB01: {
      blank_exam_wraith: {
        maxHp: 161,
        phaseConfig: {
          phases: {
            "0": {
              moves: {
                "1": {
                  v: 8
                }
              }
            },
            "1": {
              moves: {
                "1": {
                  v: 12
                }
              }
            },
            "2": {
              moves: {
                "2": {
                  v: 15
                }
              }
            }
          },
          thresholds: [107, 54]
        },
        moves: {
          "1": {
            v: 8
          }
        },
        gimmick: {
          thresholds: [107, 54]
        }
      }
    },
    SE01: {
      child_spirit_window: {
        maxHp: 70,
        moves: {
          "0": {
            v: 4
          },
          "1": {
            v: 5
          },
          "2": {
            v: 8,
            counterDamage: {
              per: 1
            }
          }
        }
      }
    },
    SE04: {
      child_spirit_window: {
        maxHp: 40,
        moves: {
          "0": {
            v: 4
          },
          "1": {
            v: 4
          },
          "2": {
            v: 6,
            counterDamage: {
              per: 1
            }
          }
        }
      },
      child_spirit_night: {
        maxHp: 20,
        moves: {
          "0": {
            v: 2
          },
          "2": {
            v: 2,
            conditionalDamage: {
              v: 3
            }
          }
        }
      },
      grandmother_spirit_dream: {
        maxHp: 29,
        moves: {
          "1": {
            v: 2
          },
          "2": {
            v: 4
          },
          "3": {
            v: 4
          }
        }
      }
    },
    SE06: {
      nurse_spirit_watch: {
        maxHp: 55,
        moves: {
          "1": {
            v: 5
          },
          "2": {
            v: 7
          }
        },
        gimmick: {
          burstDamage: 8
        }
      },
      nurse_spirit_soft: {
        maxHp: 32,
        moves: {
          "1": {
            v: 3
          },
          "2": {
            v: 4
          },
          "3": {
            v: 5,
            conditionalValueBonus: {
              v: 1
            }
          }
        }
      }
    },
    SE07: {
      nurse_spirit_watch: {
        maxHp: 47,
        moves: {
          "1": {
            v: 4
          },
          "2": {
            v: 6
          }
        },
        gimmick: {
          burstDamage: 7
        }
      },
      doctor_spirit_intern: {
        maxHp: 31,
        moves: {
          "0": {
            v: 3
          },
          "1": {
            v: 3
          },
          "2": {
            v: 4
          }
        }
      },
      cafeteria_spirit: {
        maxHp: 27,
        moves: {
          "0": {
            v: 2
          },
          "2": {
            v: 3,
            counterDamage: {
              per: 1
            }
          }
        }
      }
    },
    SE08: {
      grandmother_spirit_echo: {
        maxHp: 56,
        moves: {
          "1": {
            v: 4
          },
          "2": {
            v: 5
          }
        }
      },
      nurse_spirit_watch: {
        maxHp: 49,
        moves: {
          "1": {
            v: 4
          },
          "2": {
            v: 6
          }
        },
        gimmick: {
          burstDamage: 7
        }
      }
    },
    SN01: {
      child_spirit_night: {
        maxHp: 18,
        moves: {
          "0": {
            v: 2
          },
          "2": {
            v: 3,
            conditionalDamage: {
              v: 4
            }
          }
        }
      },
      cafeteria_spirit: {
        maxHp: 21,
        moves: {
          "0": {
            v: 3
          },
          "2": {
            v: 4,
            counterDamage: {
              per: 1
            }
          }
        }
      }
    },
    SN02: {
      doctor_spirit_intern: {
        maxHp: 29,
        moves: {
          "0": {
            v: 3
          },
          "1": {
            v: 3
          },
          "2": {
            v: 4
          }
        }
      },
      child_spirit_night: {
        maxHp: 21,
        moves: {
          "0": {
            v: 2
          },
          "2": {
            v: 2,
            conditionalDamage: {
              v: 3
            }
          }
        }
      }
    },
    SN03: {
      grandmother_spirit_dream: {
        maxHp: 25,
        moves: {
          "1": {
            v: 2
          },
          "2": {
            v: 3
          },
          "3": {
            v: 4
          }
        }
      },
      doctor_spirit_intern: {
        maxHp: 24,
        moves: {
          "0": {
            v: 3
          },
          "1": {
            v: 3
          },
          "2": {
            v: 4
          }
        }
      }
    },
    SN04: {
      locker_spirit: {
        maxHp: 24,
        moves: {
          "2": {
            v: 3
          },
          "3": {
            v: 5
          }
        }
      },
      nurse_spirit_soft: {
        maxHp: 23,
        moves: {
          "1": {
            v: 3
          },
          "2": {
            v: 5
          },
          "3": {
            v: 4,
            conditionalValueBonus: {
              v: 1
            }
          }
        }
      }
    },
    SN05: {
      locker_spirit: {
        maxHp: 21,
        moves: {
          "2": {
            v: 2
          },
          "3": {
            v: 3
          }
        }
      },
      cafeteria_spirit: {
        maxHp: 19,
        moves: {
          "0": {
            v: 2
          },
          "2": {
            v: 3,
            counterDamage: {
              per: 1
            }
          }
        }
      },
      doctor_spirit_intern: {
        maxHp: 22,
        moves: {
          "0": {
            v: 2
          },
          "1": {
            v: 2
          },
          "2": {
            v: 4
          }
        }
      }
    },
    SN06: {
      doctor_spirit_intern: {
        maxHp: 20,
        moves: {
          "0": {
            v: 3
          },
          "1": {
            v: 3
          },
          "2": {
            v: 4
          }
        }
      },
      nurse_spirit_soft: {
        maxHp: 19,
        moves: {
          "1": {
            v: 2
          },
          "2": {
            v: 3
          },
          "3": {
            v: 4,
            conditionalValueBonus: {
              v: 1
            }
          }
        }
      },
      grandmother_spirit_dream: {
        maxHp: 21,
        moves: {
          "1": {
            v: 2
          },
          "2": {
            v: 3
          },
          "3": {
            v: 4
          }
        }
      }
    },
    SN07: {
      locker_spirit: {
        maxHp: 21,
        moves: {
          "2": {
            v: 2
          },
          "3": {
            v: 3
          }
        }
      },
      doctor_spirit_intern: {
        maxHp: 22,
        moves: {
          "0": {
            v: 3
          },
          "1": {
            v: 3
          },
          "2": {
            v: 4
          }
        }
      },
      cafeteria_spirit: {
        maxHp: 20,
        moves: {
          "0": {
            v: 2
          },
          "2": {
            v: 3,
            counterDamage: {
              per: 1
            }
          }
        }
      }
    },
    SN08: {
      child_spirit_night: {
        maxHp: 16,
        moves: {
          "0": {
            v: 1
          },
          "2": {
            v: 2,
            conditionalDamage: {
              v: 3
            }
          }
        }
      },
      grandmother_spirit_dream: {
        maxHp: 22,
        moves: {
          "1": {
            v: 2
          },
          "2": {
            v: 3
          },
          "3": {
            v: 4
          }
        }
      },
      locker_spirit: {
        maxHp: 19,
        moves: {
          "2": {
            v: 2
          },
          "3": {
            v: 3
          }
        }
      },
      cafeteria_spirit: {
        maxHp: 18,
        moves: {
          "0": {
            v: 2
          },
          "2": {
            v: 3,
            counterDamage: {
              per: 1
            }
          }
        }
      }
    },
    SN09: {
      doctor_spirit_intern: {
        maxHp: 20,
        moves: {
          "0": {
            v: 2
          },
          "1": {
            v: 2
          },
          "2": {
            v: 3
          }
        }
      },
      nurse_spirit_soft: {
        maxHp: 19,
        moves: {
          "1": {
            v: 2
          },
          "2": {
            v: 3
          },
          "3": {
            v: 5,
            conditionalValueBonus: {
              v: 1
            }
          }
        }
      },
      locker_spirit: {
        maxHp: 19,
        moves: {
          "2": {
            v: 2
          },
          "3": {
            v: 3
          }
        }
      },
      child_spirit_night: {
        maxHp: 15,
        moves: {
          "0": {
            v: 1
          },
          "2": {
            v: 2,
            conditionalDamage: {
              v: 3
            }
          }
        }
      }
    }
  },
  battleGold: {
    enemy: {
      amount: 20,
      min: 15,
      max: 25
    },
    elite: {
      amount: 45,
      min: 35,
      max: 50
    },
    boss: {
      amount: 100,
      min: 80,
      max: 120
    }
  },
  shopCardPriceByRarity: {
    common: 60,
    uncommon: 90,
    rare: 120
  },
  shopDefaultCardPrice: 60,
  eventRelicFallbackGold: 70,
  rewardRarityWeights: {
    default: {
      common: 60,
      uncommon: 30,
      rare: 10
    },
    battle: {
      common: 60,
      uncommon: 30,
      rare: 10
    },
    enemy: {
      common: 60,
      uncommon: 30,
      rare: 10
    },
    normal: {
      common: 60,
      uncommon: 30,
      rare: 10
    },
    event: {
      common: 60,
      uncommon: 30,
      rare: 10
    },
    shop: {
      common: 60,
      uncommon: 30,
      rare: 10
    },
    blessing: {
      common: 60,
      uncommon: 30,
      rare: 10
    },
    prayer: {
      common: 60,
      uncommon: 30,
      rare: 10
    },
    elite: {
      common: 45,
      uncommon: 35,
      rare: 20
    }
  }
};
