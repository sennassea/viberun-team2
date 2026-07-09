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
            v: 4
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
            v: 4
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
            v: 3
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
            v: 4
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
    HN06: {
      grandmother_spirit_visit: {
        maxHp: 20,
        moves: {
          "1": {
            v: 1
          },
          "3": {
            v: 4,
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
              v: 4
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
            v: 4
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
            v: 4
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
            v: 4
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
            v: 3
          },
          "2": {
            v: 4
          },
          "3": {
            v: 4
          }
        }
      },
      grandmother_spirit_visit: {
        maxHp: 18,
        moves: {
          "1": {
            v: 3
          },
          "3": {
            v: 4,
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
            v: 3
          },
          "2": {
            v: 3,
            conditionalDamage: {
              v: 5
            }
          }
        }
      },
      nurse_spirit: {
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
            v: 3
          },
          "2": {
            v: 4
          },
          "3": {
            v: 4
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
            v: 3
          },
          "2": {
            v: 4
          }
        }
      },
      visitor_spirit_flower: {
        maxHp: 17,
        moves: {
          "1": {
            v: 3
          },
          "2": {
            v: 3
          }
        }
      },
      nurse_spirit: {
        maxHp: 18,
        moves: {
          "0": {
            v: 4
          },
          "1": {
            v: 3
          },
          "2": {
            v: 6
          }
        }
      }
    },
    HE02: {
      doctor_spirit: {
        maxHp: 75,
        moves: {
          "0": {
            v: 4
          },
          "2": {
            v: 11,
            statusCardDamage: {
              per: 1,
              maxBonus: 3
            }
          },
          "3": {
            v: 6
          }
        }
      }
    },
    HE04: {
      mother_spirit: {
        maxHp: 46,
        gimmick: {
          burstDamage: 9
        },
        moves: {
          "0": {
            v: 5
          },
          "2": {
            v: 5
          }
        }
      },
      visitor_spirit_flower: {
        maxHp: 44,
        moves: {
          "1": {
            v: 3
          },
          "2": {
            v: 5
          }
        }
      }
    },
    HE05: {
      doctor_spirit: {
        maxHp: 54,
        moves: {
          "0": {
            v: 4
          },
          "2": {
            v: 9,
            statusCardDamage: {
              per: 1
            }
          },
          "3": {
            v: 5
          }
        }
      },
      patient_spirit_waiting: {
        maxHp: 42,
        moves: {
          "1": {
            v: 4
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
    HE06: {
      surgery_light_spirit: {
        maxHp: 47,
        moves: {
          "1": {
            v: 7
          },
          "3": {
            v: 12
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
            v: 4
          },
          "2": {
            v: 7
          }
        }
      }
    },
    HE08: {
      doctor_spirit: {
        maxHp: 55,
        moves: {
          "0": {
            v: 4
          },
          "2": {
            v: 9,
            statusCardDamage: {
              per: 1,
              maxBonus: 2
            }
          },
          "3": {
            v: 5
          }
        }
      },
      surgery_light_spirit: {
        maxHp: 50,
        moves: {
          "1": {
            v: 7
          },
          "3": {
            v: 12
          }
        }
      }
    },
    HB01: {
      ward_wraith: {
        maxHp: 148,
        moves: {
          "1": {
            v: 9
          }
        },
        phaseConfig: {
          thresholds: [
            103,
            58
          ],
          phases: {
            "0": {
              moves: {
                "1": {
                  v: 9
                }
              }
            },
            "1": {
              moves: {
                "0": {
                  v: 12
                }
              }
            },
            "2": {
              moves: {
                "0": {
                  v: 16,
                  summonDamage: {
                    per: 1.5
                  }
                },
                "1": {
                  v: 9,
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
                    damage: 9
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
                    damage: 10
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
                  v: 8,
                  speedBurst: {
                    damage: 11
                  }
                }
              }
            }
          },
          thresholds: [
            107,
            54
          ]
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
      // QA: PE02가 목표(6-7턴) 대비 10-15턴으로 Act1 초반 엘리트 중 가장 늘어짐(재현성 확인됨).
      // 자가 결계 반사 기믹(monsterData.js에서 6→3으로 공통 하향)과 함께 체력도 낮춘다.
      fountain_reflection_spirit: {
        maxHp: 50,
        moves: {
          "1": {
            v: 7
          },
          "3": {
            v: 12
          }
        }
      }
    },
    PE04: {
      grandfather_spirit: {
        maxHp: 57,
        moves: {
          "0": {
            v: 4,
            counterDamage: {
              per: 1
            }
          },
          "1": {
            v: 4,
            counterDamage: {
              per: 1
            }
          },
          "2": {
            v: 4,
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
            v: 3
          },
          "2": {
            v: 4,
            statusCardDamage: {
              per: 1
            }
          }
        }
      }
    },
    PE06: {
      // 신규 기믹: 역할 전환(roleShift) — 짝을 이루는 둘 중 하나가 먼저 쓰러지면
      // 남은 쪽이 그 죽음에 반응한다. 약한 관리인이 먼저 죽으면 롱피크닉이 분노해 공격력이 오르고,
      // 롱피크닉이 먼저 죽으면 관리인이 움츠러들어 결계를 자동으로 얻는다.
      lost_picnic_spirit: {
        maxHp: 50,
        roleShift: { onAllyDeath: { type: "attackBoost", perMove: 3 } },
        moves: {
          "0": {
            v: 5
          },
          "1": {
            v: 5
          },
          "3": {
            v: 9,
            counterDamage: {
              per: 2
            }
          }
        }
      },
      nurse_spirit_callbell: {
        maxHp: 27,
        roleShift: { onAllyDeath: { type: "autoBlock", value: 8 } },
        moves: {
          "2": {
            v: 3
          },
          "3": {
            v: 5
          }
        }
      }
    },
    PE07: {
      // PE06과 동일한 역할 전환(roleShift) 기믹. 짝이 child_spirit_swallowed로 바뀌어도
      // "약한 쪽이 먼저 죽으면 롱피크닉 분노 / 롱피크닉이 먼저 죽으면 약한 쪽 웅크림" 구도는 동일하다.
      lost_picnic_spirit: {
        maxHp: 60,
        roleShift: { onAllyDeath: { type: "attackBoost", perMove: 3 } },
        moves: {
          "0": {
            v: 5
          },
          "1": {
            v: 5
          },
          "3": {
            v: 9,
            counterDamage: {
              per: 1
            }
          }
        }
      },
      child_spirit_swallowed: {
        roleShift: { onAllyDeath: { type: "autoBlock", value: 8 } },
        moves: {
          "0": {
            v: 1
          },
          "2": {
            v: 5,
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
        maxHp: 45,
        // QA: PE08가 목표(8-9턴) 대비 15-16턴으로 Act1 엘리트 중 가장 심각하게 늘어짐.
        // 이미 데미지는 낮게 조정돼 있어(v4) 체력과 성장 기믹의 지속 시간을 함께 줄인다.
        gimmick: {
          maxStack: 2
        },
        moves: {
          "0": {
            v: 4,
            counterDamage: {
              per: 1
            }
          },
          "1": {
            v: 4,
            counterDamage: {
              per: 1
            }
          },
          "2": {
            v: 4,
            counterDamage: {
              per: 1
            }
          }
        }
      },
      fountain_reflection_spirit: {
        maxHp: 36,
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
    PN01: {
      child_spirit_lost: {
        maxHp: 23,
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
      },
      child_spirit_swallowed: {
        maxHp: 27,
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
            v: 4,
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
            v: 4,
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
            v: 5
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
            v: 4,
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
            v: 3
          },
          "2": {
            v: 3
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
            v: 3
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
        maxHp: 15,
        moves: {
          "0": {
            v: 3
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
    PN06: {
      child_spirit_swallowed: {
        maxHp: 18,
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
        }
      },
      nurse_spirit_callbell: {
        maxHp: 16,
        moves: {
          "2": {
            v: 3
          },
          "3": {
            v: 4
          }
        }
      },
      patient_spirit_iv: {
        maxHp: 22,
        moves: {
          "1": {
            v: 3
          },
          "2": {
            v: 4,
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
            v: 3
          },
          "2": {
            v: 4
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
            v: 3
          },
          "2": {
            v: 4,
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
            v: 4,
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
            v: 3
          },
          "1": {
            v: 3,
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
            v: 4,
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
            v: 3
          },
          "3": {
            v: 4
          }
        }
      },
      grandmother_spirit: {
        maxHp: 22,
        moves: {
          "1": {
            v: 3
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
    PN09: {
      grandmother_spirit_memory: {
        maxHp: 21,
        moves: {
          "1": {
            v: 3
          },
          "2": {
            v: 3,
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
            v: 3
          },
          "3": {
            v: 4
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
            v: 4,
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
            v: 3
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
    SB01: {
      blank_exam_wraith: {
        maxHp: 161,
        phaseConfig: {
          phases: {
            "0": {
              moves: {
                "1": {
                  v: 9
                }
              }
            },
            "1": {
              moves: {
                "1": {
                  v: 13
                }
              }
            },
            "2": {
              moves: {
                "2": {
                  v: 16
                }
              }
            }
          },
          thresholds: [
            107,
            54
          ]
        },
        moves: {
          "1": {
            v: 9
          }
        },
        gimmick: {
          thresholds: [
            107,
            54
          ]
        }
      }
    },
    SE01: {
      child_spirit_window: {
        maxHp: 78,
        // QA: SE01이 목표(6-7턴) 대비 5턴으로 다소 빠르게 끝남 + 자동 플레이 특성상
        // 질문 기믹의 오답 페널티가 거의 발동하지 않아 소폭 상향. 오답 시 폭발 계수도 2→3으로 강화.
        gimmick: {
          burstPerStack: 3
        },
        moves: {
          "0": {
            v: 5
          },
          "1": {
            v: 6
          },
          "2": {
            v: 9,
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
            v: 5
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
      },
      child_spirit_night: {
        maxHp: 20,
        moves: {
          "0": {
            v: 3
          },
          "2": {
            v: 3,
            conditionalDamage: {
              v: 4
            }
          }
        }
      },
      grandmother_spirit_dream: {
        maxHp: 29,
        moves: {
          "1": {
            v: 3
          },
          "2": {
            v: 5
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
            v: 7
          },
          "2": {
            v: 9
          }
        },
        gimmick: {
          burstDamage: 10
        }
      },
      nurse_spirit_soft: {
        maxHp: 32,
        moves: {
          "1": {
            v: 4
          },
          "2": {
            v: 6
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
            v: 6
          },
          "2": {
            v: 9
          }
        },
        gimmick: {
          burstDamage: 10
        }
      },
      doctor_spirit_intern: {
        maxHp: 31,
        moves: {
          "0": {
            v: 4
          },
          "1": {
            v: 4
          },
          "2": {
            v: 6
          }
        }
      },
      cafeteria_spirit: {
        maxHp: 27,
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
    SE08: {
      // QA: SE08이 목표(8-9턴) 대비 12턴으로 늘어짐. 메아리 배율 자체는 monsterData.js에서
      // 0.5→0.35로 공통 하향했고, 여기서는 체력을 소폭 추가로 낮춘다.
      grandmother_spirit_echo: {
        maxHp: 50,
        moves: {
          "1": {
            v: 6
          },
          "2": {
            v: 7
          }
        }
      },
      nurse_spirit_watch: {
        maxHp: 49,
        moves: {
          "1": {
            v: 7
          },
          "2": {
            v: 9
          }
        },
        gimmick: {
          burstDamage: 10
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
            v: 4
          },
          "1": {
            v: 4
          },
          "2": {
            v: 5
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
            v: 3,
            conditionalDamage: {
              v: 4
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
            v: 4
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
            v: 4
          },
          "1": {
            v: 4
          },
          "2": {
            v: 5
          }
        }
      }
    },
    SN04: {
      locker_spirit: {
        maxHp: 24,
        moves: {
          "2": {
            v: 4
          },
          "3": {
            v: 6
          }
        }
      },
      nurse_spirit_soft: {
        maxHp: 23,
        moves: {
          "1": {
            v: 4
          },
          "2": {
            v: 6
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
            v: 3
          },
          "3": {
            v: 4
          }
        }
      },
      cafeteria_spirit: {
        maxHp: 19,
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
            v: 5
          }
        }
      }
    },
    SN06: {
      doctor_spirit_intern: {
        maxHp: 20,
        moves: {
          "0": {
            v: 4
          },
          "1": {
            v: 4
          },
          "2": {
            v: 5
          }
        }
      },
      nurse_spirit_soft: {
        maxHp: 19,
        moves: {
          "1": {
            v: 3
          },
          "2": {
            v: 4
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
            v: 3
          },
          "2": {
            v: 5
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
            v: 3
          },
          "3": {
            v: 4
          }
        }
      },
      doctor_spirit_intern: {
        maxHp: 22,
        moves: {
          "0": {
            v: 4
          },
          "1": {
            v: 4
          },
          "2": {
            v: 5
          }
        }
      },
      cafeteria_spirit: {
        maxHp: 20,
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
    SN08: {
      child_spirit_night: {
        maxHp: 16,
        moves: {
          "0": {
            v: 1
          },
          "2": {
            v: 3,
            conditionalDamage: {
              v: 4
            }
          }
        }
      },
      grandmother_spirit_dream: {
        maxHp: 22,
        moves: {
          "1": {
            v: 3
          },
          "2": {
            v: 5
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
            v: 3
          },
          "3": {
            v: 4
          }
        }
      },
      cafeteria_spirit: {
        maxHp: 18,
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
    SN09: {
      doctor_spirit_intern: {
        maxHp: 20,
        moves: {
          "0": {
            v: 4
          },
          "1": {
            v: 4
          },
          "2": {
            v: 5
          }
        }
      },
      nurse_spirit_soft: {
        maxHp: 19,
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
      },
      locker_spirit: {
        maxHp: 19,
        moves: {
          "2": {
            v: 3
          },
          "3": {
            v: 4
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
            v: 3,
            conditionalDamage: {
              v: 4
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
