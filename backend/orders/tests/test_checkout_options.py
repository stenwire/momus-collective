from rest_framework.test import APIClient

from orders.locations import ISLAND, LAGOS_LGAS, NIGERIAN_STATES


def test_options_list_every_state_and_the_lagos_lgas():
    body = APIClient().get("/api/v1/checkout/options/").json()
    assert len(body["states"]) == 37
    assert "Lagos" in body["states"] and "FCT" in body["states"]
    assert len(body["lagos_lgas"]) == 20
    assert body["lagos_lgas"] == sorted(body["lagos_lgas"])


def test_every_lagos_lga_has_a_side():
    assert set(LAGOS_LGAS.values()) == {"mainland", "island"}
    assert {k for k, v in LAGOS_LGAS.items() if v == ISLAND} == {
        "Eti-Osa",
        "Ibeju-Lekki",
        "Lagos Island",
    }


def test_states_are_unique():
    assert len(set(NIGERIAN_STATES)) == len(NIGERIAN_STATES)
