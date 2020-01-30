////////////////////////////////////////////////////////////////////////////////////////////////////
//                               This file is part of CosmoScout VR                               //
//      and may be used under the terms of the MIT license. See the LICENSE file for details.     //
//                        Copyright: (c) 2019 German Aerospace Center (DLR)                       //
////////////////////////////////////////////////////////////////////////////////////////////////////

#include "Plugin.hpp"

#include "../../../src/cs-core/GraphicsEngine.hpp"
#include "../../../src/cs-core/GuiManager.hpp"
#include "../../../src/cs-core/SolarSystem.hpp"
#include "../../../src/cs-core/TimeControl.hpp"
#include "../../../src/cs-utils/convert.hpp"
#include "../../../src/cs-utils/utils.hpp"

#include <VistaKernel/GraphicsManager/VistaSceneGraph.h>
#include <VistaKernel/VistaSystem.h>
#include <VistaKernelOpenSGExt/VistaOpenSGMaterialTools.h>

// Include VESTEC nodes
#include "VestecNodes/CinemaDBNode.hpp"
#include "VestecNodes/WildFireSourceNode.hpp"
#include "VestecNodes/RenderNode2D.hpp"

EXPORT_FN cs::core::PluginBase* create() {
  return new cs::vestec::Plugin;
}

EXPORT_FN void destroy(cs::core::PluginBase* pluginBase) {
  delete pluginBase;
}

// Init data dir
std::string cs::vestec::Plugin::dataDir = "";

namespace cs::vestec {

void from_json(const nlohmann::json& j, Plugin::Settings& o) {
  cs::core::parseSection("csp-vestec", [&] {
    o.mVestecDataDir = cs::core::parseProperty<std::string>("vestec-data-dir", j);
    o.mFireDir       = cs::core::parseProperty<std::string>("vestec-2D-fire", j);
  });
}

Plugin::Plugin()
    : mProperties(std::make_shared<Properties>()) {
}

void Plugin::InitGUI() {
}

void Plugin::init() {
  std::cout << "Init: CosmoScout VR Plugin for the VESTEC EU project" << std::endl;

  // Add the VESTEC tab to the sidebar
  mGuiManager->addPluginTabToSideBarFromHTML(
      "VESTEC", "whatshot", "../share/resources/gui/vestec_tab.html");
  // mGuiManager->addScriptToSideBarFromJS("../share/resources/gui/js/vestec_sidebar.js");

  // Adding the main GUI item for VESTEC to cosmoscout
  m_pVESTEC_UI = new cs::gui::GuiItem("file://../share/resources/gui/vestecWindow.html", 1);
  mGuiManager->addGuiItem(m_pVESTEC_UI, 10);
  m_pVESTEC_UI->setRelSizeX(1.0f);
  m_pVESTEC_UI->setRelSizeY(1.0f);
  m_pVESTEC_UI->setRelPositionY(1.f);
  m_pVESTEC_UI->setRelPositionX(0.f);
  m_pVESTEC_UI->setRelOffsetY(-0.45f);
  m_pVESTEC_UI->setRelOffsetX(0.5f);
  m_pVESTEC_UI->waitForFinishedLoading();

  // Read the plugin settings from the scene config
  mPluginSettings = mAllSettings->mPlugins.at("csp-vestec");

  // add anchor node and register to solar system
  mVestecTransform = std::make_shared<cs::scene::CelestialAnchorNode>(
      mSceneGraph->GetRoot(), mSceneGraph->GetNodeBridge(), "", "Earth", "IAU_Earth");
  mSolarSystem->registerAnchor(mVestecTransform);

  // Initialize and append gui elements
  InitGUI();

  // Initialize vestec flow editor
  m_pNodeEditor = new VNE::NodeEditor(m_pVESTEC_UI);

  // TODO:Create the Node editor
  m_pNodeEditor->RegisterSocketType("CINEMA_DB");
  m_pNodeEditor->RegisterSocketType("TEXTURE");

  // Register our node types for the flow editor
  m_pNodeEditor->RegisterNodeType(CinemaDBNode::GetName(), "Sources",
      [](cs::gui::GuiItem* webView, int id) { return new CinemaDBNode(webView, id); },
      [](VNE::NodeEditor* editor) { CinemaDBNode::Init(editor); });

  m_pNodeEditor->RegisterNodeType(WildFireSourceNode::GetName(), "Sources",
      [this](cs::gui::GuiItem* webView, int id) {
        return new WildFireSourceNode(mPluginSettings, webView, id);
      },
      [](VNE::NodeEditor* editor) { WildFireSourceNode::Init(editor); });

  m_pNodeEditor->RegisterNodeType(RenderNode2D::GetName(), "Renderer",
    [this](cs::gui::GuiItem* webView, int id) {
      return new RenderNode2D(mPluginSettings, webView, id, mSolarSystem.get(), mVestecTransform.get(), mGraphicsEngine.get());
    },
    [](VNE::NodeEditor* editor) { RenderNode2D::Init(editor); });

  // Initialize the editor in HTML and JavaScript
  m_pNodeEditor->InitNodeEditor();

  // Set the data dir which is used by other classes
  Plugin::dataDir = mPluginSettings.mVestecDataDir;

  std::cout << "[CSP::VESTEC ::Initialize()] Init  done #########################" << std::endl;
}

void Plugin::deInit() {
  mSolarSystem->unregisterAnchor(mVestecTransform);
  mSceneGraph->GetRoot()->DisconnectChild(mVestecTransform.get());
  delete m_pNodeEditor;
}

void Plugin::update() {
  auto  simTime = mTimeControl->pSimulationTime.get();
  float timeOfDay =
      cs::utils::convert::toBoostTime(simTime).time_of_day().total_milliseconds() / 1000.0;
  // Update plugin per frame
}

} // namespace cs::vestec
